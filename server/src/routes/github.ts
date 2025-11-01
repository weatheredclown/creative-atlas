import { Router, type Response } from 'express';
import { firestore } from '../firebaseAdmin.js';
import type { AuthenticatedRequest } from '../middleware/authenticate.js';
import { authenticate } from '../middleware/authenticate.js';
import { z } from 'zod';
import asyncHandler from '../utils/asyncHandler.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { addJob } from '../utils/queue.js';

const execAsync = promisify(exec);

const router = Router();

router.use(authenticate);

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

const createGithubAuthUrl = (req: AuthenticatedRequest): string => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.github_oauth_state = state;

  const redirectUri = `${process.env.APP_BASE_URL}/api/github/oauth/callback`;
  const scope = 'repo,user';

  return `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
};

const respondWithOAuthPage = (
  res: Response,
  result: { status: 'success' | 'error'; message?: string },
) => {
  const appBaseUrl = process.env.APP_BASE_URL ?? '';
  let targetOrigin = '*';
  let fallbackUrl = appBaseUrl || '/';

  try {
    if (appBaseUrl) {
      const url = new URL(appBaseUrl);
      targetOrigin = url.origin;
      if (result.status === 'success') {
        url.searchParams.set('github_auth', 'success');
      }
      fallbackUrl = url.toString();
    }
  } catch (error) {
    console.warn('Failed to parse APP_BASE_URL for OAuth response', error);
    targetOrigin = appBaseUrl || '*';
    fallbackUrl = appBaseUrl || '/';
  }

  const payload = JSON.stringify({
    type: 'github-oauth',
    status: result.status,
    message: result.message,
  });

  const pageMessage =
    result.status === 'success'
      ? 'GitHub authorization complete. You may close this window.'
      : result.message ?? 'GitHub authorization failed. You may close this window.';

  res
    .status(result.status === 'success' ? 200 : 400)
    .setHeader('Content-Type', 'text/html; charset=utf-8')
    .send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>GitHub Authorization</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 2rem; text-align: center; }
    </style>
  </head>
  <body>
    <p>${pageMessage}</p>
    <script>
      (function() {
        const payload = ${payload};
        const targetOrigin = ${JSON.stringify(targetOrigin)};
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(payload, targetOrigin);
            window.close();
            return;
          }
        } catch (error) {
          console.error('Unable to notify opener about GitHub OAuth result', error);
        }
        if (payload.status === 'success') {
          window.location.replace(${JSON.stringify(fallbackUrl)});
        }
      })();
    </script>
  </body>
</html>`);
};

router.get('/oauth/start', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const authUrl = createGithubAuthUrl(req);
    if (req.accepts('json')) {
        res.json({ authUrl });
        return;
    }
    res.redirect(authUrl);
}));

router.post('/oauth/start', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const authUrl = createGithubAuthUrl(req);
    res.json({ authUrl });
}));

router.get('/oauth/callback', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { code, state } = req.query;
    const storedState = req.session.github_oauth_state;

    if (!state || state !== storedState) {
        respondWithOAuthPage(res, { status: 'error', message: 'Invalid state parameter.' });
        return;
    }

    req.session.github_oauth_state = undefined;

    const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            client_id: GITHUB_CLIENT_ID,
            client_secret: GITHUB_CLIENT_SECRET,
            code,
        }),
    });

    const data = await response.json();

    if (data.error) {
        respondWithOAuthPage(res, { status: 'error', message: data.error_description ?? 'GitHub authorization failed.' });
        return;
    }

    req.session.github_access_token = data.access_token;

    respondWithOAuthPage(res, { status: 'success' });
}));

const publishSchema = z.object({
    repoName: z.string().min(1),
    publishDir: z.string().optional(),
});

router.post('/publish', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { repoName, publishDir } = publishSchema.parse(req.body);
    const accessToken = req.session.github_access_token;

    if (!accessToken) {
        return res.status(401).json({ error: 'GitHub access token not found in session.' });
    }

    addJob(async () => {
        const response = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: {
                'Authorization': `token ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
            },
            body: JSON.stringify({
                name: repoName,
                private: false,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Error creating repository:', data.message);
            return;
        }

        try {
            await execAsync('npm run build', { cwd: 'code' });
        } catch (error) {
            console.error('Error building project:', error);
            return;
        }

        const owner = data.owner.login;
        const repo = data.name;

        const distPath = path.resolve('code', 'dist');

        const files = await fs.readdir(distPath, { withFileTypes: true });
        const fileBlobs = [];

        for (const file of files) {
            if (file.isFile()) {
                const content = await fs.readFile(path.join(distPath, file.name), 'base64');
                const blobResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${accessToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                    },
                    body: JSON.stringify({
                        content,
                        encoding: 'base64',
                    }),
                });
                const blobData = await blobResponse.json();
                const filePath = publishDir ? path.join(publishDir, file.name) : file.name;
                fileBlobs.push({
                    path: filePath,
                    mode: '100644',
                    type: 'blob',
                    sha: blobData.sha,
                });
            }
        }

        const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
            },
            body: JSON.stringify({
                tree: fileBlobs,
            }),
        });
        const treeData = await treeResponse.json();

        const commitResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
            },
            body: JSON.stringify({
                message: 'Initial commit',
                tree: treeData.sha,
            }),
        });
        const commitData = await commitResponse.json();

        await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
            },
            body: JSON.stringify({
                ref: 'refs/heads/gh-pages',
                sha: commitData.sha,
            }),
        });

        console.log('Successfully published to GitHub Pages!');
    });

    res.json({ message: 'Publishing process started.' });
}));

export default router;

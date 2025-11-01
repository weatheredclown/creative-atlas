import { Router } from 'express';
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

const oauthCallbackSchema = z.object({
  code: z.string().min(1),
});

router.get('/oauth/start', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.github_oauth_state = state;

    const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
    const redirectUri = `${process.env.APP_BASE_URL}/api/github/oauth/callback`;
    const scope = 'repo,user';

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;

    res.redirect(authUrl);
}));

router.get('/oauth/callback', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { code, state } = req.query;
    const storedState = req.session.github_oauth_state;

    if (!state || state !== storedState) {
        return res.status(400).json({ error: 'Invalid state parameter' });
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
        return res.status(400).json({ error: data.error_description });
    }

    req.session.github_access_token = data.access_token;

    res.redirect(`${process.env.APP_BASE_URL}?github_auth=success`);
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

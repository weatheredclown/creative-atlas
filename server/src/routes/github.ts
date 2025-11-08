import { Router, type Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/authenticate.js';
import { authenticate } from '../middleware/authenticate.js';
import { z } from 'zod';
import asyncHandler from '../utils/asyncHandler.js';
import path from 'node:path';
import crypto from 'node:crypto';
import { addJob } from '../utils/queue.js';

const router = Router();

const GITHUB_CLIENT_ID =
  process.env.CA_GITHUB_CLIENT_ID ?? process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET =
  process.env.CA_GITHUB_CLIENT_SECRET ?? process.env.GITHUB_CLIENT_SECRET;

if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
  throw new Error(
    'GitHub OAuth credentials are not configured. Set CA_GITHUB_CLIENT_ID and CA_GITHUB_CLIENT_SECRET.',
  );
}

const createGithubAuthUrl = (req: AuthenticatedRequest): string => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.github_oauth_state = state;

  let appBaseUrl = process.env.APP_BASE_URL ?? '';
  if (appBaseUrl && !appBaseUrl.startsWith('http')) {
    appBaseUrl = `https://` + appBaseUrl;
  }

  const redirectUri = `${appBaseUrl}/api/github/oauth/callback`;
  const scope = 'repo,user';

  return `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
};

const respondWithOAuthPage = (
  res: Response,
  result: { status: 'success' | 'error'; message?: string },
) => {
  let appBaseUrl = process.env.APP_BASE_URL ?? '';
  if (appBaseUrl === 'placeholder') {
    appBaseUrl = '';
  }

  if (!appBaseUrl) {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim());
    appBaseUrl = allowedOrigins[0] ?? '';
  }

  let targetOrigin = '*';
  const createRelativeFallbackUrl = () => {
    const params = new URLSearchParams({ github_auth: result.status });
    if (result.status === 'error' && result.message) {
      params.set('github_message', result.message);
    }
    const query = params.toString();
    return query ? `/?${query}` : '/';
  };

  let fallbackUrl = createRelativeFallbackUrl();

  if (appBaseUrl) {
    try {
      const url = new URL(appBaseUrl);
      targetOrigin = url.origin;
      url.searchParams.set('github_auth', result.status);
      if (result.status === 'error') {
        if (result.message) {
          url.searchParams.set('github_message', result.message);
        }
      } else {
        url.searchParams.delete('github_message');
      }
      fallbackUrl = url.toString();
    } catch (error) {
      console.warn(
        'Failed to parse effective APP_BASE_URL for OAuth response',
        error,
      );
      // If the URL is invalid, we can't use it.
      // We've already set fallbackUrl to '/', so we just log and continue.
      targetOrigin = '*';
    }
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
        window.location.replace(${JSON.stringify(fallbackUrl)});
      })();
    </script>
  </body>
</html>`);
};

const parseJsonSafely = (payload: string): unknown => {
  if (!payload) {
    return undefined;
  }

  try {
    return JSON.parse(payload);
  } catch {
    return undefined;
  }
};

const formatGithubError = (status: number, payload: string): string => {
  const parsed = parseJsonSafely(payload);
  if (parsed && typeof parsed === 'object') {
    const candidate = parsed as { message?: unknown; errors?: unknown };
    const baseMessage = typeof candidate.message === 'string' ? candidate.message : '';

    let detailed = '';
    if (Array.isArray(candidate.errors)) {
      detailed = candidate.errors
        .map((entry) => {
          if (!entry || typeof entry !== 'object') {
            return '';
          }
          const errorEntry = entry as {
            resource?: unknown;
            field?: unknown;
            code?: unknown;
            message?: unknown;
          };
          const parts = [errorEntry.resource, errorEntry.field, errorEntry.code, errorEntry.message]
            .map((part) => (typeof part === 'string' ? part : ''))
            .filter((part) => part.length > 0);
          return parts.join(' ');
        })
        .filter((part) => part.length > 0)
        .join('; ');
    }

    const combined = [baseMessage, detailed].filter((part) => part.length > 0).join(' | ');
    if (combined) {
      return `${combined} (status ${status})`;
    }
  }

  if (payload) {
    return `${payload} (status ${status})`;
  }

  return `status ${status}`;
};

const ensureGithubSuccess = async (
  response: globalThis.Response,
  context: string,
): Promise<void> => {
  if (response.ok) {
    return;
  }

  const text = await response.text();
  throw new Error(`${context}: ${formatGithubError(response.status, text)}`);
};

const readGithubJson = async <T>(
  response: globalThis.Response,
  context: string,
): Promise<T> => {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${context}: ${formatGithubError(response.status, text)}`);
  }

  if (!text) {
    throw new Error(`${context}: GitHub returned an empty response.`);
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`${context}: Unable to parse GitHub response as JSON.`);
  }
};

const sanitizePublishDir = (dir: string | undefined): 'docs' | undefined => {
  if (!dir) {
    return undefined;
  }

  const trimmed = dir.trim().replace(/^\/+|\/+$/g, '');
  if (!trimmed) {
    return undefined;
  }

  return trimmed.toLowerCase() === 'docs' ? 'docs' : undefined;
};

const sanitizeSiteFilePath = (filePath: string): string => {
  const normalized = filePath.replace(/\\+/g, '/').replace(/^\/+/, '').trim();

  if (!normalized) {
    throw new Error('Site files must include a valid path.');
  }

  const segments = normalized.split('/').filter((segment) => segment.length > 0);

  if (segments.some((segment) => segment === '..')) {
    throw new Error(`Invalid site file path: ${filePath}`);
  }

  return segments.join('/');
};

interface PublishJobOptions {
  accessToken: string;
  repoName: string;
  publishDir?: string;
  siteFiles: Array<{ path: string; contents: string }>;
}

interface PublishJobResult {
  message: string;
  repository: string;
  pagesUrl: string;
}

const runPublishJob = async ({
  accessToken,
  repoName,
  publishDir,
  siteFiles,
}: PublishJobOptions): Promise<PublishJobResult> => {
  const normalizedPublishDir = sanitizePublishDir(publishDir);
  const targetDirectory = normalizedPublishDir === 'docs' ? 'docs' : undefined;
  const defaultHeaders = {
    Authorization: `token ${accessToken}`,
    Accept: 'application/vnd.github+json',
  } as const;

  if (!siteFiles.length) {
    throw new Error('No site files provided for publication.');
  }

  const isNewRepo = !repoName.includes('/');
  let owner: string;
  let repo: string;

  if (isNewRepo) {
    const createResponse = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        ...defaultHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: repoName,
        private: false,
      }),
    });

    if (createResponse.status === 422) {
      const errorPayload = await createResponse.text();
      const parsedError = parseJsonSafely(errorPayload);
      const canFallback = (() => {
        if (parsedError && typeof parsedError === 'object') {
          const candidate = parsedError as { message?: unknown; errors?: unknown };
          const baseMessage =
            typeof candidate.message === 'string' ? candidate.message.toLowerCase() : '';
          if (baseMessage.includes('already exists')) {
            return true;
          }

          if (Array.isArray(candidate.errors)) {
            return candidate.errors.some((entry) => {
              if (!entry || typeof entry !== 'object') {
                return false;
              }
              const errorEntry = entry as { message?: unknown; code?: unknown };
              const message =
                typeof errorEntry.message === 'string'
                  ? errorEntry.message.toLowerCase()
                  : '';
              const code =
                typeof errorEntry.code === 'string' ? errorEntry.code.toLowerCase() : '';
              return message.includes('already exists') || code === 'already_exists';
            });
          }
        }

        return false;
      })();

      if (!canFallback) {
        throw new Error(`Failed to create repository: ${formatGithubError(422, errorPayload)}`);
      }

      const currentUserResponse = await fetch('https://api.github.com/user', {
        headers: defaultHeaders,
      });
      const currentUser = await readGithubJson<{ login: string }>(
        currentUserResponse,
        'Failed to resolve GitHub account for existing repository',
      );
      owner = currentUser.login;
      repo = repoName;
    } else {
      const createdRepository = await readGithubJson<{
        owner: { login: string };
        name: string;
      }>(createResponse, 'Failed to create repository');
      owner = createdRepository.owner.login;
      repo = createdRepository.name;
    }
  } else {
    [owner, repo] = repoName.split('/', 2);
  }

  const normalizedFiles = Array.from(
    new Map(
      siteFiles.map((file) => {
        const sanitizedPath = sanitizeSiteFilePath(file.path);
        const relativePath = targetDirectory
          ? path.posix.join(targetDirectory, sanitizedPath)
          : sanitizedPath;
        return [relativePath, file.contents] as const;
      }),
    ).entries(),
  ).map(([relativePath, contents]) => ({
    relativePath,
    base64Content: Buffer.from(contents, 'utf8').toString('base64'),
  }));

  const fileBlobs = await Promise.all(
    normalizedFiles.map(async (file) => {
      const blobResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
        {
          method: 'POST',
          headers: {
            ...defaultHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: file.base64Content, encoding: 'base64' }),
        },
      );

      const blobData = await readGithubJson<{ sha: string }>(
        blobResponse,
        `Failed to upload ${file.relativePath} to GitHub`,
      );

      return { path: file.relativePath, mode: '100644', type: 'blob', sha: blobData.sha };
    }),
  );

  let parentCommitSha: string | undefined;
  const refResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/gh-pages`,
    {
      headers: defaultHeaders,
    },
  );

  if (refResponse.ok) {
    const refData = await readGithubJson<{ object: { sha: string } }>(
      refResponse,
      'Failed to read gh-pages reference',
    );
    parentCommitSha = refData.object.sha;
  } else if (refResponse.status !== 404) {
    await ensureGithubSuccess(refResponse, 'Unable to inspect gh-pages reference');
  }

  const treeResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees`,
    {
      method: 'POST',
      headers: {
        ...defaultHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tree: fileBlobs,
      }),
    },
  );
  const treeData = await readGithubJson<{ sha: string }>(
    treeResponse,
    'Failed to create Git tree for publication',
  );

  const commitPayload: { message: string; tree: string; parents?: string[] } = {
    message: 'Publish to GitHub Pages',
    tree: treeData.sha,
  };

  if (parentCommitSha) {
    commitPayload.parents = [parentCommitSha];
  }

  const commitResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/commits`,
    {
      method: 'POST',
      headers: {
        ...defaultHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commitPayload),
    },
  );
  const commitData = await readGithubJson<{ sha: string }>(
    commitResponse,
    'Failed to create publication commit',
  );

  const refPayload = {
    sha: commitData.sha,
    force: false,
  };

  if (parentCommitSha) {
    const updateRefResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/gh-pages`,
      {
        method: 'PATCH',
        headers: {
          ...defaultHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(refPayload),
      },
    );
    await ensureGithubSuccess(updateRefResponse, 'Failed to update gh-pages reference');
  } else {
    const createRefResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs`,
      {
        method: 'POST',
        headers: {
          ...defaultHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: 'refs/heads/gh-pages', ...refPayload }),
      },
    );
    await ensureGithubSuccess(createRefResponse, 'Failed to create gh-pages reference');
  }

  const pagesSourcePath = targetDirectory ? `/${targetDirectory}` : '/';
  const enablePagesResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pages`,
    {
      method: 'PUT',
      headers: {
        ...defaultHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: { branch: 'gh-pages', path: pagesSourcePath },
      }),
    },
  );

  if (!enablePagesResponse.ok && enablePagesResponse.status !== 409) {
    await ensureGithubSuccess(enablePagesResponse, 'Failed to enable GitHub Pages');
  }

  const repository = `${owner}/${repo}`;
  const pagesUrl = `https://${owner}.github.io/${repo}`;

  return {
    message: `Published ${repository} from the gh-pages branch.`,
    repository,
    pagesUrl,
  };
};

router.get('/oauth/start', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
    const authUrl = createGithubAuthUrl(req);
    if (req.accepts('json')) {
        res.json({ authUrl });
        return;
    }
    res.redirect(authUrl);
}));

router.post('/oauth/start', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
    const authUrl = createGithubAuthUrl(req);
    res.json({ authUrl });
}));

router.get('/status', authenticate, (req: AuthenticatedRequest, res) => {
  res.json({ authorized: Boolean(req.session.github_access_token) });
});

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

router.get('/repos', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const accessToken = req.session.github_access_token;

  if (!accessToken) {
    return res.status(401).json({ error: 'GitHub access token not found in session.' });
  }

  try {
    const response = await fetch(
      'https://api.github.com/user/repos?type=owner&sort=pushed&per_page=100',
      {
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: 'application/vnd.github+json',
        },
      },
    );

    const repos = await readGithubJson<
      Array<{ full_name: string; name: string }>
    >(response, 'Unable to load repositories from GitHub');

    const repoData = repos.map((repo) => ({
      fullName: repo.full_name,
      name: repo.name,
    }));

    res.json(repoData);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unexpected error while loading GitHub repositories.';
    res.status(502).json({ error: message });
  }
}));

const publishSchema = z.object({
    repoName: z.string().min(1),
    publishDir: z.string().optional(),
    siteFiles: z
      .array(
        z.object({
          path: z.string().min(1),
          contents: z.string(),
        }),
      )
      .min(1, 'Provide at least one file to publish.'),
});

router.post('/publish', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { repoName, publishDir, siteFiles } = publishSchema.parse(req.body);
  const accessToken = req.session.github_access_token;

  if (!accessToken) {
    return res.status(401).json({ error: 'GitHub access token not found in session.' });
  }

  try {
    const result = await addJob(() =>
      runPublishJob({ accessToken, repoName, publishDir, siteFiles }),
    );
    res.json(result);
  } catch (error) {
    console.error('Failed to publish project to GitHub', error);
    const message =
      error instanceof Error
        ? error.message
        : 'An unknown error occurred while publishing to GitHub.';
    res.status(502).json({ error: message });
  }
}));

export default router;

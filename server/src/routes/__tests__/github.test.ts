import express from 'express';
import session from 'express-session';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.CA_GITHUB_CLIENT_ID = process.env.CA_GITHUB_CLIENT_ID ?? 'test-client-id';
  process.env.CA_GITHUB_CLIENT_SECRET = process.env.CA_GITHUB_CLIENT_SECRET ?? 'test-client-secret';
});

const mocks = vi.hoisted(() => ({
  execMock: vi.fn(),
  readdirMock: vi.fn(),
  readFileMock: vi.fn(),
}));

vi.mock('../../firebaseAdmin.js', () => ({
  auth: {
    verifyIdToken: vi.fn(async () => ({ uid: 'test-user' })),
  },
}));

vi.mock('child_process', () => ({
  exec: mocks.execMock,
}));

vi.mock('fs/promises', () => ({
  default: {
    readdir: mocks.readdirMock,
    readFile: mocks.readFileMock,
  },
  readdir: mocks.readdirMock,
  readFile: mocks.readFileMock,
}));

// The router import must come after the mocks so they are applied to its dependencies.
import githubRouter from '../github.js';

const { execMock, readdirMock, readFileMock } = mocks;

const fetchMock = vi.fn<typeof fetch>();

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use(
    session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: true,
    }),
  );
  app.use((req, _res, next) => {
    req.session.github_access_token = 'access-token';
    next();
  });
  app.use('/api/github', githubRouter);
  return app;
};

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  execMock.mockReset();
  readdirMock.mockReset();
  readFileMock.mockReset();

  execMock.mockImplementation((command: string, optionsOrCallback: unknown, maybeCallback?: unknown) => {
    const callback =
      typeof optionsOrCallback === 'function'
        ? optionsOrCallback
        : (maybeCallback as ((error: unknown, stdout?: string, stderr?: string) => void) | undefined);
    callback?.(null, '', '');
    return undefined;
  });

  readdirMock.mockResolvedValue([
    { name: 'index.html', isDirectory: () => false } as unknown,
  ]);

  readFileMock.mockResolvedValue('PGgxPkhlbGxvPC9oMT4=');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });

describe('GitHub routes', () => {
  describe('GET /api/github/repos', () => {
    it('returns repositories for the authenticated user', async () => {
      const app = createApp();

      fetchMock.mockResolvedValueOnce(
        jsonResponse([
          { full_name: 'test-user/example', name: 'example' },
          { full_name: 'test-user/demo', name: 'demo' },
        ]),
      );

      const response = await request(app)
        .get('/api/github/repos')
        .set('Authorization', 'Bearer fake-token')
        .expect(200);

      expect(response.body).toEqual([
        { fullName: 'test-user/example', name: 'example' },
        { fullName: 'test-user/demo', name: 'demo' },
      ]);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/user/repos?type=owner&sort=pushed&per_page=100',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'token access-token' }),
        }),
      );
    });

    it('propagates GitHub API errors to the client', async () => {
      const app = createApp();

      fetchMock.mockResolvedValueOnce(
        jsonResponse({ message: 'rate limited' }, { status: 403 }),
      );

      const response = await request(app)
        .get('/api/github/repos')
        .set('Authorization', 'Bearer fake-token')
        .expect(502);

      expect(response.body.error).toContain('rate limited');
    });
  });

  describe('POST /api/github/publish', () => {
    it('falls back to an existing repository when creation returns 422 and completes the publish flow', async () => {
      const app = createApp();

      fetchMock
        .mockResolvedValueOnce(
          jsonResponse(
            {
              message: 'Repository creation failed.',
              errors: [
                {
                  resource: 'Repository',
                  code: 'already_exists',
                  field: 'name',
                  message: 'name already exists on this account',
                },
              ],
            },
            { status: 422 },
          ),
        )
        .mockResolvedValueOnce(
          jsonResponse({ login: 'test-user' }),
        )
        .mockResolvedValueOnce(
          jsonResponse({ sha: 'blob-sha' }, { status: 201 }),
        )
        .mockResolvedValueOnce(
          new Response('', { status: 404 }),
        )
        .mockResolvedValueOnce(
          jsonResponse({ sha: 'tree-sha' }, { status: 201 }),
        )
        .mockResolvedValueOnce(
          jsonResponse({ sha: 'commit-sha' }, { status: 201 }),
        )
        .mockResolvedValueOnce(
          jsonResponse({}, { status: 201 }),
        )
        .mockResolvedValueOnce(
          jsonResponse({ message: 'already enabled' }, { status: 409 }),
        );

      const response = await request(app)
        .post('/api/github/publish')
        .set('Authorization', 'Bearer fake-token')
        .send({ repoName: 'demo-site', publishDir: '' })
        .expect(200);

      expect(execMock).toHaveBeenCalledWith(
        'npm run build',
        expect.objectContaining({ cwd: 'code' }),
        expect.any(Function),
      );

      expect(response.body).toEqual({
        message: 'Published test-user/demo-site from the gh-pages branch.',
        repository: 'test-user/demo-site',
        pagesUrl: 'https://test-user.github.io/demo-site',
      });

      expect(fetchMock).toHaveBeenCalledTimes(8);
    });

    it('surfaces GitHub publication failures with details', async () => {
      const app = createApp();

      fetchMock
        .mockResolvedValueOnce(
          jsonResponse(
            {
              owner: { login: 'test-user' },
              name: 'demo-site',
            },
            { status: 201 },
          ),
        )
        .mockResolvedValueOnce(
          jsonResponse({ sha: 'blob-sha' }, { status: 201 }),
        )
        .mockResolvedValueOnce(
          new Response('', { status: 404 }),
        )
        .mockResolvedValueOnce(
          jsonResponse({ message: 'tree failure' }, { status: 500 }),
        );

      const response = await request(app)
        .post('/api/github/publish')
        .set('Authorization', 'Bearer fake-token')
        .send({ repoName: 'demo-site', publishDir: '' })
        .expect(502);

      expect(response.body.error).toContain('Failed to create Git tree for publication');
      expect(response.body.error).toContain('tree failure');
    });
  });
});

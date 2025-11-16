import type {
  Artifact,
  ConlangLexeme,
  MemorySyncConversation,
  NpcMemoryRun,
  Project,
  ProjectShareStatus,
  SharedProjectPayload,
  StaticSiteFile,
  UserProfile,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_DATA_API_BASE_URL?.replace(/\/$/, '') ?? '';

export const dataApiBaseUrl = API_BASE_URL;

export const isDataApiConfigured = API_BASE_URL.length > 0;

const withAuth = async (token: string | null, init: RequestInit = {}): Promise<RequestInit> => {
  if (!token) {
    throw new Error('Authentication token is required for data API requests.');
  }

  const headers = new Headers(init.headers ?? {});
  headers.set('Authorization', `Bearer ${token}`);

  const credentials = init.credentials ?? 'include';

  return { ...init, headers, credentials };
};

const parseJson = async <T>(response: Response): Promise<T> => {
  const rawText = await response.text();

  if (!response.ok) {
    throw new Error(rawText || `Data API request failed with status ${response.status}.`);
  }

  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error('Data API returned an empty response.');
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const contentType = response.headers.get('Content-Type') ?? 'unknown content type';
    const snippet = trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed;
    const normalizedContentType = contentType.toLowerCase();

    if (normalizedContentType.includes('json')) {
      throw new Error(`Failed to parse JSON response from data API: ${snippet}`);
    }

    throw new Error(
      `Expected JSON response from data API but received ${contentType}: ${snippet}`,
    );
  }
};

const sendJson = async <T>(
  token: string | null,
  path: string,
  init: RequestInit & { body?: unknown },
): Promise<T> => {
  if (!isDataApiConfigured) {
    throw new Error('Data API is not configured.');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...(await withAuth(token, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    })),
  });

  return parseJson<T>(response);
};

export interface ProjectListResponse {
  projects: Project[];
  nextPageToken?: string;
}

export interface ArtifactListResponse {
  artifacts: Artifact[];
  nextPageToken?: string;
}

export interface MemorySyncOverviewResponse {
  conversations: MemorySyncConversation[];
  npcMemoryRuns: NpcMemoryRun[];
}

export type ArtifactDraft = {
  id?: string;
  type: Artifact['type'];
  title: string;
  summary?: string;
  status?: string;
  tags?: string[];
  relations?: Artifact['relations'];
  data?: Artifact['data'];
};

export const fetchProfile = async (token: string | null): Promise<UserProfile> =>
  sendJson<UserProfile>(token, '/api/profile', { method: 'GET' });

export const fetchMemorySyncOverview = async (
  token: string | null,
): Promise<MemorySyncOverviewResponse> => sendJson<MemorySyncOverviewResponse>(token, '/api/memory-sync', { method: 'GET' });

export const updateProfileViaApi = async (
  token: string | null,
  update: Partial<Pick<UserProfile, 'displayName' | 'photoURL' | 'achievementsUnlocked' | 'questlinesClaimed'>> & {
    settings?: Partial<UserProfile['settings']>;
  },
): Promise<UserProfile> =>
  sendJson<UserProfile>(token, '/api/profile', { method: 'PATCH', body: update });

export const incrementProfileXp = async (token: string | null, amount: number): Promise<UserProfile> =>
  sendJson<UserProfile>(token, '/api/profile/xp', { method: 'POST', body: { amount } });

export const fetchProjects = async (
  token: string | null,
  params: { pageSize?: number; pageToken?: string } = {},
): Promise<ProjectListResponse> => {
  if (!isDataApiConfigured) {
    throw new Error('Data API is not configured.');
  }

  const query = new URLSearchParams();
  if (params.pageSize) {
    query.set('pageSize', String(params.pageSize));
  }
  if (params.pageToken) {
    query.set('pageToken', params.pageToken);
  }
  const qs = query.toString();
  const response = await fetch(`${API_BASE_URL}/api/projects${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    ...(await withAuth(token)),
  });
  return parseJson<ProjectListResponse>(response);
};

export const createProjectViaApi = async (
  token: string | null,
  project: { title: string; summary?: string; status?: string; tags?: string[] },
): Promise<Project> => sendJson<Project>(token, '/api/projects', { method: 'POST', body: project });

export const updateProjectViaApi = async (
  token: string | null,
  projectId: string,
  updates: Partial<Pick<Project, 'title' | 'summary' | 'status' | 'tags' | 'nanoBananaImage'>>,
): Promise<Project> => sendJson<Project>(token, `/api/projects/${projectId}`, { method: 'PATCH', body: updates });

export const deleteProjectViaApi = async (token: string | null, projectId: string): Promise<void> => {
  if (!isDataApiConfigured) {
    throw new Error('Data API is not configured.');
  }

  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
    method: 'DELETE',
    ...(await withAuth(token)),
  });

  if (!response.ok && response.status !== 204) {
    const message = await response.text();
    throw new Error(message || 'Failed to delete project.');
  }
};

export const fetchProjectArtifacts = async (
  token: string | null,
  projectId: string,
  params: { pageSize?: number; pageToken?: string } = {},
): Promise<ArtifactListResponse> => {
  if (!isDataApiConfigured) {
    throw new Error('Data API is not configured.');
  }

  const query = new URLSearchParams();
  if (params.pageSize) {
    query.set('pageSize', String(params.pageSize));
  }
  if (params.pageToken) {
    query.set('pageToken', params.pageToken);
  }
  const qs = query.toString();
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/artifacts${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    ...(await withAuth(token)),
  });
  return parseJson<ArtifactListResponse>(response);
};

export const createArtifactsViaApi = async (
  token: string | null,
  projectId: string,
  artifacts: ArtifactDraft[],
): Promise<Artifact[]> =>
  sendJson<{ artifacts: Artifact[] }>(token, `/api/projects/${projectId}/artifacts`, {
    method: 'POST',
    body: { artifacts },
  }).then((payload) => payload.artifacts);

export const getProjectShareStatus = async (
  token: string | null,
  projectId: string,
): Promise<ProjectShareStatus> =>
  sendJson<ProjectShareStatus>(token, `/api/projects/${projectId}/share`, { method: 'GET' });

export const enableProjectShare = async (
  token: string | null,
  projectId: string,
): Promise<{ shareId: string }> =>
  sendJson<{ shareId: string }>(token, `/api/projects/${projectId}/share`, { method: 'POST' });

export const disableProjectShare = async (
  token: string | null,
  projectId: string,
): Promise<{ success: boolean }> =>
  sendJson<{ success: boolean }>(token, `/api/projects/${projectId}/share`, { method: 'DELETE' });

export const fetchSharedProject = async (shareId: string): Promise<SharedProjectPayload> => {
  if (!isDataApiConfigured) {
    throw new Error('Data API is not configured.');
  }

  const response = await fetch(`${API_BASE_URL}/api/share/${shareId}`, {
    method: 'GET',
    credentials: 'include',
  });

  return parseJson<SharedProjectPayload>(response);
};

export const updateArtifactViaApi = async (
  token: string | null,
  artifactId: string,
  updates: Partial<Pick<Artifact, 'title' | 'summary' | 'status' | 'tags' | 'relations' | 'data'>>,
): Promise<Artifact> => sendJson<Artifact>(token, `/api/artifacts/${artifactId}`, { method: 'PATCH', body: updates });

export const deleteArtifactViaApi = async (token: string | null, artifactId: string): Promise<void> => {
  if (!isDataApiConfigured) {
    throw new Error('Data API is not configured.');
  }

  const response = await fetch(`${API_BASE_URL}/api/artifacts/${artifactId}`, {
    method: 'DELETE',
    ...(await withAuth(token)),
  });

  if (!response.ok && response.status !== 204) {
    const message = await response.text();
    throw new Error(message || 'Failed to delete artifact.');
  }
};

export const deleteAccountViaApi = async (token: string | null): Promise<void> => {
  if (!isDataApiConfigured) {
    throw new Error('Data API is not configured.');
  }

  const response = await fetch(`${API_BASE_URL}/api/account`, {
    method: 'DELETE',
    ...(await withAuth(token)),
  });

  if (!response.ok && response.status !== 204) {
    const message = await response.text();
    throw new Error(message || 'Failed to delete account.');
  }
};

export const importArtifactsViaApi = async (
  token: string | null,
  projectId: string,
  content: string,
): Promise<{ artifacts: Artifact[] }> => {
  if (!isDataApiConfigured) {
    throw new Error('Data API is not configured.');
  }

  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/import-artifacts`, {
    method: 'POST',
    ...(await withAuth(token, {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    })),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to import artifacts through API.');
  }

  return response.json();
};

export const downloadProjectExport = async (
  token: string | null,
  projectId: string,
  format: 'csv' | 'tsv' | 'markdown',
): Promise<Blob> => {
  if (!isDataApiConfigured) {
    throw new Error('Data API is not configured.');
  }

  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/export?format=${format}`, {
    method: 'GET',
    ...(await withAuth(token)),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to export artifacts through API.');
  }

  return response.blob();
};

export const parseLexiconCsvViaApi = async (
  token: string | null,
  content: string,
): Promise<ConlangLexeme[]> => {
  if (!isDataApiConfigured) {
    throw new Error('Data API is not configured.');
  }

  const response = await fetch(`${API_BASE_URL}/api/lexicon/import/csv`, {
    method: 'POST',
    ...(await withAuth(token, {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    })),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to parse lexicon CSV.');
  }

  const data = await response.json();
  return data.lexemes as ConlangLexeme[];
};

export const parseLexiconMarkdownViaApi = async (
  token: string | null,
  content: string,
): Promise<ConlangLexeme[]> => {
  if (!isDataApiConfigured) {
    throw new Error('Data API is not configured.');
  }

  const response = await fetch(`${API_BASE_URL}/api/lexicon/import/markdown`, {
    method: 'POST',
    ...(await withAuth(token, {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    })),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to parse lexicon Markdown.');
  }

  const data = await response.json();
  return data.lexemes as ConlangLexeme[];
};

export const exportLexiconViaApi = async (
  token: string | null,
  lexemes: ConlangLexeme[],
  format: 'csv' | 'markdown',
): Promise<string> => {
  if (!isDataApiConfigured) {
    throw new Error('Data API is not configured.');
  }

  const response = await fetch(`${API_BASE_URL}/api/lexicon/export`, {
    method: 'POST',
    ...(await withAuth(token, {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lexemes, format }),
    })),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to export lexicon.');
  }

  return response.text();
};

export const exchangeCodeForToken = async (
  token: string | null,
  code: string,
): Promise<{ accessToken: string }> => {
  if (!isDataApiConfigured) {
    throw new Error('Data API is not configured.');
  }

  return sendJson<{ accessToken: string }>(token, '/api/github/oauth/callback', {
    method: 'POST',
    body: { code },
  });
}

export interface PublishToGitHubResponse {
  message: string;
  repository: string;
  pagesUrl: string;
}

interface PublishToGitHubJobResponse {
  jobId: string;
  status: { id: string; state: string; updatedAt: string; error?: string };
  result?: PublishToGitHubResponse;
}

export interface GitHubRepositorySummary {
  fullName: string;
  name: string;
}

export const publishToGitHub = async (
  token: string | null,
  repoName: string,
  publishDir: string,
  siteFiles: StaticSiteFile[],
): Promise<PublishToGitHubResponse> => {
  if (!isDataApiConfigured) {
    throw new Error('Data API is not configured.');
  }

  const response = await sendJson<PublishToGitHubJobResponse>(token, '/api/github/publish', {
    method: 'POST',
    body: { repoName, publishDir, siteFiles },
  });

  if (!response.result) {
    throw new Error('GitHub publish job did not return a result.');
  }

  return response.result;
};

export const fetchGitHubRepositories = async (
  token: string | null,
): Promise<GitHubRepositorySummary[]> =>
  sendJson<GitHubRepositorySummary[]>(token, '/api/github/repos', {
    method: 'GET',
  });

export interface GitHubOAuthStartResponse {
  authUrl: string;
}

export interface GitHubAuthorizationStatusResponse {
  authorized: boolean;
}

export const startGitHubOAuth = async (
  token: string | null,
): Promise<GitHubOAuthStartResponse> => {
  if (!isDataApiConfigured) {
    throw new Error('Data API is not configured.');
  }

  const response = await fetch(`${API_BASE_URL}/api/github/oauth/start`, {
    method: 'POST',
    ...(await withAuth(token, {
      headers: {
        Accept: 'application/json',
      },
    })),
  });

  return parseJson<GitHubOAuthStartResponse>(response);
};

export const checkGitHubAuthorization = async (
  token: string | null,
): Promise<GitHubAuthorizationStatusResponse> => {
  if (!isDataApiConfigured) {
    throw new Error('Data API is not configured.');
  }

  const response = await fetch(`${API_BASE_URL}/api/github/status`, {
    method: 'GET',
    ...(await withAuth(token, {
      headers: {
        Accept: 'application/json',
      },
    })),
  });

  return parseJson<GitHubAuthorizationStatusResponse>(response);
};

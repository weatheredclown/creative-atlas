import type { Artifact, ConlangLexeme, Project, UserProfile } from '../types';

const API_BASE_URL = import.meta.env.VITE_DATA_API_BASE_URL?.replace(/\/$/, '') ?? '';

export const isDataApiConfigured = API_BASE_URL.length > 0;

const withAuth = async (token: string | null, init: RequestInit = {}): Promise<RequestInit> => {
  if (!token) {
    throw new Error('Authentication token is required for data API requests.');
  }

  const headers = new Headers(init.headers ?? {});
  headers.set('Authorization', `Bearer ${token}`);

  return { ...init, headers };
};

const parseJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Data API request failed with status ${response.status}.`);
  }
  return (await response.json()) as T;
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
  updates: Partial<Pick<Project, 'title' | 'summary' | 'status' | 'tags'>>,
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

export const publishToGitHub = async (
  token: string | null,
  repoName: string,
  publishDir: string,
): Promise<{ message: string, data: any }> => {
  if (!isDataApiConfigured) {
    throw new Error('Data API is not configured.');
  }

  return sendJson<{ message: string, data: any }>(token, '/api/github/publish', {
    method: 'POST',
    body: { repoName, publishDir },
  });
}

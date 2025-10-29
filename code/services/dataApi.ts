import type { Artifact, ConlangLexeme } from '../types';

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

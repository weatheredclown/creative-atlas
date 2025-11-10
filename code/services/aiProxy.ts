const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
const GEMINI_PROXY_PATH = '/api/ai/generate';

export interface GeminiProxyConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
  responseSchema?: unknown;
}

export interface GeminiProxyRequest {
  prompt: string;
  model?: string;
  config?: GeminiProxyConfig;
}

interface GeminiProxyResponse {
  text?: string;
  error?: string;
  details?: unknown;
}

const buildProxyUrl = (): string => {
  if (API_BASE_URL) {
    return `${API_BASE_URL}${GEMINI_PROXY_PATH}`;
  }
  return GEMINI_PROXY_PATH;
};

export const requestGeminiText = async (payload: GeminiProxyRequest): Promise<string> => {
  const response = await fetch(buildProxyUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(async () => ({
    error: 'Invalid response from Gemini proxy.',
    details: await response.text().catch(() => undefined),
  }))) as GeminiProxyResponse;

  if (!response.ok) {
    const message =
      typeof data.error === 'string'
        ? data.error
        : `Gemini proxy request failed with status ${response.status}.`;
    throw new Error(message);
  }

  if (!data.text || typeof data.text !== 'string') {
    throw new Error('Gemini proxy returned an empty response.');
  }

  return data.text;
};

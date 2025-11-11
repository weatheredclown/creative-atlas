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

export class GeminiProxyError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, options: { status?: number; details?: unknown; cause?: unknown } = {}) {
    super(message);
    this.name = 'GeminiProxyError';
    this.status = typeof options.status === 'number' ? options.status : 0;
    this.details = options.details;
    if ('cause' in options && options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export const isGeminiProxyError = (error: unknown): error is GeminiProxyError => error instanceof GeminiProxyError;

export const getGeminiErrorMessage = (error: unknown, fallback: string): string => {
  const base = fallback.trim().length > 0 ? fallback.trim() : 'Gemini request failed.';

  if (isGeminiProxyError(error)) {
    const detail = error.message.trim();
    if (detail.length > 0) {
      if (detail.toLowerCase().startsWith(base.toLowerCase())) {
        return detail;
      }
      return `${base} ${detail}`.trim();
    }
    return base;
  }

  if (error instanceof Error) {
    const detail = error.message.trim();
    if (detail.length > 0) {
      return `${base} Details: ${detail}`;
    }
    return base;
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return `${base} Details: ${error.trim()}`;
  }

  return base;
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
      typeof data.error === 'string' && data.error.trim().length > 0
        ? data.error
        : `Gemini proxy request failed with status ${response.status}.`;
    throw new GeminiProxyError(message, { status: response.status, details: data.details });
  }

  if (!data.text || typeof data.text !== 'string') {
    throw new GeminiProxyError('Gemini proxy returned an empty response.', {
      status: response.status,
      details: data.details,
    });
  }

  return data.text;
};

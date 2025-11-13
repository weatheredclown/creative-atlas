const normalizeBaseUrl = (value?: string): string =>
  value && value.trim().length > 0 ? value.replace(/\/$/, '') : '';

const API_BASE_URL =
  normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL) ||
  normalizeBaseUrl(import.meta.env.VITE_DATA_API_BASE_URL);
const GEMINI_PROXY_PATH = '/api/ai/generate';
const MODEL_TOKEN_LIMIT = 8192;
const AVERAGE_CHARS_PER_TOKEN = 4;

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

export const buildAiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (API_BASE_URL) {
    return `${API_BASE_URL}${normalizedPath}`;
  }
  return normalizedPath;
};

const buildProxyUrl = (): string => buildAiUrl(GEMINI_PROXY_PATH);

const estimatePromptTokens = (prompt: string): number => {
  if (!prompt) {
    return 0;
  }

  const compact = prompt.replace(/\s+/g, ' ').trim();
  if (!compact) {
    return 0;
  }

  return Math.max(1, Math.ceil(compact.length / AVERAGE_CHARS_PER_TOKEN));
};

const clampOutputTokens = (
  prompt: string,
  config: GeminiProxyConfig | undefined,
): GeminiProxyConfig | undefined => {
  if (!config || typeof config.maxOutputTokens !== 'number') {
    return config;
  }

  const promptTokens = estimatePromptTokens(prompt);
  const available = MODEL_TOKEN_LIMIT - promptTokens;

  if (available <= 0) {
    throw new GeminiProxyError(
      'Gemini request is too large to process. Remove some context or shorten the prompt, then try again.',
      { status: 400 },
    );
  }

  const safeMaxOutputTokens = Math.max(1, Math.min(config.maxOutputTokens, available));

  if (safeMaxOutputTokens === config.maxOutputTokens) {
    return config;
  }

  return {
    ...config,
    maxOutputTokens: safeMaxOutputTokens,
  };
};

const TOKEN_LIMIT_PATTERNS = ['max_tokens', 'max tokens', 'token limit', 'max_output_tokens'];

const toNormalizedText = (value: unknown): string | null => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value.toLowerCase();
  }

  try {
    return JSON.stringify(value).toLowerCase();
  } catch (error) {
    console.warn('Failed to normalize Gemini error details', error);
    return null;
  }
};

const isTokenLimitError = (error: GeminiProxyError): boolean => {
  const sources: unknown[] = [error.message, error.details];
  return sources.some((source) => {
    const normalized = toNormalizedText(source);
    if (!normalized) {
      return false;
    }

    return TOKEN_LIMIT_PATTERNS.some((pattern) => normalized.includes(pattern));
  });
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
    if (isTokenLimitError(error)) {
      return `${base} Gemini request is too large. Remove some context or shorten the prompt, then try again.`;
    }

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
  const prompt = payload.prompt.trim();
  const config = clampOutputTokens(prompt, payload.config);

  if (!API_BASE_URL && import.meta.env.PROD) {
    throw new GeminiProxyError(
      'Gemini proxy is not configured. Set VITE_API_BASE_URL or VITE_DATA_API_BASE_URL in the deployment environment.'
    );
  }

  const response = await fetch(buildProxyUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      ...payload,
      prompt,
      config,
    }),
  });

  const data = (await response.json().catch(async () => ({
    error: 'Invalid response from Gemini proxy.',
    details: await response.text().catch(() => undefined),
  }))) as GeminiProxyResponse;

  if (!response.ok) {
    let message =
      typeof data.error === 'string'
        ? data.error
        : `Gemini proxy request failed with status ${response.status}.`;

    if (data.details) {
      message += `\n${JSON.stringify(data.details, null, 2)}`;
    }
    throw new GeminiProxyError(message, { status: response.status, details: data.details });
  }

  if (!data.text || typeof data.text !== 'string') {
    const message =
      typeof data.error === 'string' && data.error.trim().length > 0
        ? data.error.trim()
        : 'Gemini proxy returned an empty response.';

    throw new GeminiProxyError(message, {
      status: response.status,
      details: data.details,
    });
  }

  return data.text;
};

const normalizeBaseUrl = (value?: string): string =>
  value && value.trim().length > 0 ? value.trim().replace(/\/$/, '') : '';

const API_BASE_URL =
  normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL) ||
  normalizeBaseUrl(import.meta.env.VITE_DATA_API_BASE_URL);

const AGENT_ENDPOINT = '/api/agent/step';

export type GhostAgentActionType = 'click' | 'type' | 'scroll' | 'ask' | 'done';

export interface GhostAgentAction {
  action: GhostAgentActionType;
  x?: number;
  y?: number;
  text?: string;
  prompt?: string;
  reasoning?: string;
  [key: string]: unknown;
}

export type GhostAgentHistoryEntry = Record<string, unknown>;

export interface GhostAgentRequestPayload {
  objective: string;
  screenshotBase64: string;
  screenWidth: number;
  screenHeight: number;
  history?: GhostAgentHistoryEntry[];
  projectContext?: string;
}

const buildAgentUrl = (): string => {
  if (API_BASE_URL) {
    return `${API_BASE_URL}${AGENT_ENDPOINT}`;
  }

  return AGENT_ENDPOINT;
};

const parseErrorResponse = async (response: Response): Promise<string> => {
  try {
    const data = (await response.json()) as { error?: unknown; details?: unknown };
    if (typeof data?.error === 'string' && data.error.trim().length > 0) {
      const detail =
        typeof data.details === 'string' && data.details.trim().length > 0
          ? ` ${data.details.trim()}`
          : '';
      return `${data.error.trim()}${detail}`.trim();
    }
  } catch (error) {
    console.warn('Failed to parse ghost agent error payload', error);
  }

  return `Ghost agent request failed with status ${response.status}.`;
};

export const requestGhostAgentStep = async (
  payload: GhostAgentRequestPayload,
): Promise<GhostAgentAction> => {
  if (!API_BASE_URL && import.meta.env.PROD) {
    throw new Error(
      'Ghost agent API is not configured. Set VITE_API_BASE_URL or VITE_DATA_API_BASE_URL in the deployment environment.',
    );
  }

  const response = await fetch(buildAgentUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  const data = (await response.json().catch(async (error) => {
    console.warn('Ghost agent returned a non-JSON payload', error);
    return null;
  })) as GhostAgentAction | null;

  if (!data || typeof data !== 'object') {
    throw new Error('Ghost agent returned an empty response.');
  }

  if (typeof data.action !== 'string') {
    throw new Error('Ghost agent response did not include an action.');
  }

  return data;
};

export default requestGhostAgentStep;

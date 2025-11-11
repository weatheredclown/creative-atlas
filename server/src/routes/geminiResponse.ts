import type { EnhancedGenerateContentResponse } from '@google/generative-ai';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stringifyCandidatePart = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return `${value}`;
  }

  if (isPlainObject(value) || Array.isArray(value)) {
    try {
      const json = JSON.stringify(value);
      return json.length > 0 ? json : null;
    } catch (error) {
      console.warn('Failed to stringify Gemini candidate part', error);
      return null;
    }
  }

  return null;
};

export const extractTextFromResponse = (
  response: EnhancedGenerateContentResponse,
): string | null => {
  try {
    const directText = response.text().trim();
    if (directText) {
      return directText;
    }
  } catch (error) {
    // Swallow errors from the helper if Gemini blocked the prompt or returned no text.
  }

  const candidates = response.candidates;
  if (!Array.isArray(candidates)) {
    return null;
  }

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') {
      continue;
    }

    const parts = candidate.content?.parts;
    if (!Array.isArray(parts)) {
      continue;
    }

    const segments: string[] = [];

    for (const part of parts) {
      if (!part || typeof part !== 'object') {
        continue;
      }

      const text = (part as { text?: unknown }).text;
      if (typeof text === 'string') {
        const trimmed = text.trim();
        if (trimmed.length > 0) {
          segments.push(trimmed);
          continue;
        }
      }

      const functionCall = (part as { functionCall?: unknown }).functionCall;
      if (isPlainObject(functionCall)) {
        const args = (functionCall as { args?: unknown }).args;
        const stringified = stringifyCandidatePart(args);
        if (stringified) {
          segments.push(stringified);
          continue;
        }
      }

      const inlineData = (part as { inlineData?: { data?: unknown } }).inlineData;
      if (inlineData && typeof inlineData === 'object') {
        const dataString = stringifyCandidatePart(inlineData.data);
        if (dataString) {
          segments.push(dataString);
          continue;
        }
      }

      const data = (part as { data?: unknown }).data;
      const dataString = stringifyCandidatePart(data);
      if (dataString) {
        segments.push(dataString);
      }
    }

    if (segments.length > 0) {
      return segments.join('\n\n');
    }
  }

  return null;
};

export default extractTextFromResponse;

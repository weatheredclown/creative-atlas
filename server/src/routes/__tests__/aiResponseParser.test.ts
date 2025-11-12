import { describe, expect, it } from 'vitest';
import type {
  EnhancedGenerateContentResponse,
  GenerateContentCandidate,
  Part,
} from '@google/generative-ai';
import { extractTextFromResponse } from '../geminiResponse.js';

const createCandidate = (parts: Array<Record<string, unknown>>): GenerateContentCandidate => ({
  index: 0,
  content: {
    role: 'model',
    parts: parts as unknown as Part[],
  },
});

const createResponse = (
  overrides: Partial<EnhancedGenerateContentResponse> = {},
): EnhancedGenerateContentResponse => {
  const base: EnhancedGenerateContentResponse = {
    text: () => '',
    functionCall: () => undefined,
    functionCalls: () => undefined,
    candidates: [],
  };

  return {
    ...base,
    ...overrides,
  } as EnhancedGenerateContentResponse;
};

describe('extractTextFromResponse', () => {
  it('returns trimmed text when the response includes direct text output', () => {
    const response = createResponse({
      text: () => '  Quick fact ready to save.  ',
    });

    expect(extractTextFromResponse(response)).toBe('Quick fact ready to save.');
  });

  it('stringifies function call arguments when Gemini returns structured data', () => {
    const response = createResponse({
      candidates: [
        createCandidate([
          {
            functionCall: {
              name: 'respond',
              args: {
                fact: 'The Dustlands Archive glows brighter when strangers share a secret.',
                spark: 'Log a follow-up entry exploring who tends the archive flames.',
              },
            },
          },
        ]),
      ],
    });

    expect(extractTextFromResponse(response)).toBe(
      JSON.stringify({
        fact: 'The Dustlands Archive glows brighter when strangers share a secret.',
        spark: 'Log a follow-up entry exploring who tends the archive flames.',
      }),
    );
  });

  it('combines multiple parts and ignores empty text segments', () => {
    const response = createResponse({
      text: () => '',
      candidates: [
        createCandidate([
          { text: '   ' },
          {
            functionCall: {
              name: 'respond',
              args: '{"fact":"Sky caravans drift between floating markets."}',
            },
          },
          {
            // Use a loose cast so the test can simulate inline data structures
            // that are not described by the official Gemini typings yet.
            data: { followUp: 'Chart their trade routes next.' },
          },
        ]),
      ],
    });

    expect(extractTextFromResponse(response)).toBe(
      '{"fact":"Sky caravans drift between floating markets."}\n\n{"followUp":"Chart their trade routes next."}',
    );
  });
});

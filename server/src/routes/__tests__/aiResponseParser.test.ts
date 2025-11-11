import { describe, expect, it } from 'vitest';
import type { EnhancedGenerateContentResponse } from '@google/generative-ai';
import { extractTextFromResponse } from '../geminiResponse.js';

const createResponse = (
  overrides: Partial<EnhancedGenerateContentResponse> & { text?: () => string } = {},
): EnhancedGenerateContentResponse => {
  const base = {
    text: () => '',
    candidates: [],
  } satisfies Partial<EnhancedGenerateContentResponse> & { text: () => string };

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
        {
          content: {
            parts: [
              {
                functionCall: {
                  name: 'respond',
                  args: {
                    fact: 'The Dustlands Archive glows brighter when strangers share a secret.',
                    spark: 'Log a follow-up entry exploring who tends the archive flames.',
                  },
                },
              },
            ],
          },
        },
      ],
    } as EnhancedGenerateContentResponse);

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
        {
          content: {
            parts: [
              { text: '   ' },
              {
                functionCall: {
                  name: 'respond',
                  args: '{"fact":"Sky caravans drift between floating markets."}',
                },
              },
              {
                data: { followUp: 'Chart their trade routes next.' },
              },
            ],
          },
        },
      ],
    } as EnhancedGenerateContentResponse);

    expect(extractTextFromResponse(response)).toBe(
      '{"fact":"Sky caravans drift between floating markets."}\n\n{"followUp":"Chart their trade routes next."}',
    );
  });
});


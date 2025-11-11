import { describe, expect, it } from 'vitest';
import type { GenerateContentCandidate, GenerateContentResponse } from '@google/genai';

import { extractTextFromResponse } from '../ai.js';

const buildResponse = (value: Partial<GenerateContentResponse>): GenerateContentResponse => {
  return value as GenerateContentResponse;
};

const buildCandidate = (value: Partial<GenerateContentCandidate>): GenerateContentCandidate => {
  return value as GenerateContentCandidate;
};

describe('extractTextFromResponse', () => {
  it('returns the trimmed top-level text when available', () => {
    const response = buildResponse({ text: '  hello world  ' });

    expect(extractTextFromResponse(response)).toBe('hello world');
  });

  it('joins candidate part text when provided', () => {
    const response = buildResponse({
      candidates: [
        buildCandidate({
          content: {
            parts: [
              { text: ' First paragraph. ' },
              { text: '\nSecond paragraph.\n' },
            ],
          },
        }),
      ],
    });

    expect(extractTextFromResponse(response)).toBe('First paragraph.\n\nSecond paragraph.');
  });

  it('stringifies function call args objects', () => {
    const response = buildResponse({
      candidates: [
        buildCandidate({
          content: {
            parts: [
              {
                functionCall: {
                  name: 'output',
                  args: { fact: 'A fact', spark: 'A spark' },
                },
              },
            ],
          },
        }),
      ],
    });

    expect(extractTextFromResponse(response)).toBe('{"fact":"A fact","spark":"A spark"}');
  });

  it('uses function call args strings when provided', () => {
    const response = buildResponse({
      candidates: [
        buildCandidate({
          content: {
            parts: [
              {
                functionCall: {
                  name: 'output',
                  args: '  {"fact":"Structured"}  ',
                },
              },
            ],
          },
        }),
      ],
    });

    expect(extractTextFromResponse(response)).toBe('{"fact":"Structured"}');
  });

  it('stringifies function response payloads', () => {
    const response = buildResponse({
      candidates: [
        buildCandidate({
          content: {
            parts: [
              {
                functionResponse: {
                  name: 'output',
                  response: { result: { fact: 'Nested fact' } },
                },
              },
            ],
          },
        }),
      ],
    });

    expect(extractTextFromResponse(response)).toBe('{"result":{"fact":"Nested fact"}}');
  });
});

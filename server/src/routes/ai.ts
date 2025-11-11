import { Router } from 'express';
import { GoogleGenAI, type GenerationConfig, type GenerateContentResponse } from '@google/genai';
import { z } from 'zod';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

let cachedClient: GoogleGenAI | null = null;

const getClient = (): GoogleGenAI => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey });
  }

  return cachedClient;
};

const generationConfigSchema = z
  .object({
    temperature: z.number().min(0).max(2).optional(),
    topP: z.number().min(0).max(1).optional(),
    topK: z.number().int().min(0).max(1000).optional(),
    maxOutputTokens: z.number().int().min(1).max(32768).optional(),
    responseMimeType: z.string().min(1).max(100).optional(),
    responseSchema: z.unknown().optional(),
  })
  .strict();

const generateRequestSchema = z.object({
  model: z.string().trim().min(1).default('gemini-2.5-flash'),
  prompt: z.string().trim().min(1, 'Prompt is required.'),
  config: generationConfigSchema.optional(),
});

const extractTextFromResponse = (response: GenerateContentResponse): string | null => {
  const directText = typeof response.text === 'string' ? response.text.trim() : '';
  if (directText) {
    return directText;
  }

  const candidates = (response as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates)) {
    return null;
  }

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') {
      continue;
    }

    const parts = (candidate as { content?: { parts?: unknown } }).content?.parts;
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
        }
      }
    }

    if (segments.length > 0) {
      return segments.join('\n\n');
    }
  }

  return null;
};

router.post(
  '/generate',
  asyncHandler(async (req, res) => {
    const parsed = generateRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request payload.',
        details: parsed.error.flatten(),
      });
      return;
    }

    const { model, prompt, config } = parsed.data;

    let client: GoogleGenAI;
    try {
      client = getClient();
    } catch (error) {
      console.error('Failed to initialize Gemini client', error);
      res.status(500).json({
        error: 'Gemini proxy is not configured.',
      });
      return;
    }

    const contents = [
      {
        role: 'user' as const,
        parts: [{ text: prompt }],
      },
    ];

    const payload: Parameters<typeof client.models.generateContent>[0] = {
      model,
      contents,
    };

    if (config) {
      payload.config = config as GenerationConfig;
    }

    try {
      const response = await client.models.generateContent(payload);
      const text = extractTextFromResponse(response);

      if (!text) {
        res.status(502).json({
          error: 'Gemini returned an empty response.',
        });
        return;
      }

      res.json({ text });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Gemini error occurred.';
      console.error('Gemini proxy request failed', message);
      res.status(502).json({
        error: 'Gemini request failed.',
        details: message,
      });
    }
  }),
);

export default router;

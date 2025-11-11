import { Router } from 'express';
import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  type EnhancedGenerateContentResponse,
  type GenerateContentRequest,
  type GenerationConfig,
  type SafetySetting,
} from '@google/generative-ai';
import { z } from 'zod';
import asyncHandler from '../utils/asyncHandler.js';
import { extractTextFromResponse } from './geminiResponse.js';

const router = Router();

let cachedClient: GoogleGenerativeAI | null = null;

const DEFAULT_SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
] as const satisfies ReadonlyArray<SafetySetting>;

const getDefaultSafetySettings = (): SafetySetting[] =>
  DEFAULT_SAFETY_SETTINGS.map((setting) => ({ ...setting }));

const getClient = (): GoogleGenerativeAI => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenerativeAI(apiKey);
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

    let client: GoogleGenerativeAI;
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

    const payload: GenerateContentRequest = {
      contents,
      safetySettings: getDefaultSafetySettings(),
    };

    if (config) {
      payload.generationConfig = config as GenerationConfig;
    }

    try {
      const modelClient = client.getGenerativeModel({ model });
      const { response } = await modelClient.generateContent(payload);
      const text = extractTextFromResponse(response);

      if (!text) {
        console.log(
          'Gemini returned an empty text response. Full response object:',
          JSON.stringify(response, null, 2),
        );
        res.status(502).json({
          error: 'Gemini returned an empty response.',
        });
        return;
      }

      if (
        text.startsWith('Request was blocked') ||
        text.startsWith('Response was blocked')
      ) {
        console.log(
          'Gemini request was blocked. Details:',
          text,
          'Full response object:',
          JSON.stringify(response, null, 2),
        );
        res.status(502).json({
          error: 'Gemini request was blocked.',
          details: text,
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

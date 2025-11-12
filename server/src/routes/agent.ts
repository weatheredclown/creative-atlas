import { Router } from 'express';
import { SchemaType, type Schema } from '@google/generative-ai';
import { z } from 'zod';
import asyncHandler from '../utils/asyncHandler.js';
import { getGeminiClient } from '../utils/geminiClient.js';

const router = Router();

const AGENT_MODEL_ID = 'gemini-2.5-computer-use-preview-10-2025';

const historySchema = z
  .array(z.record(z.string(), z.unknown()))
  .max(50)
  .optional();

const agentStepRequestSchema = z
  .object({
    objective: z.string().trim().min(1, 'Objective is required.'),
    screenshotBase64: z.string().trim().min(100, 'Screenshot capture is required.'),
    history: historySchema,
    screenWidth: z.number().int().positive().max(10000),
    screenHeight: z.number().int().positive().max(10000),
  })
  .strict();

type AgentStepRequest = z.infer<typeof agentStepRequestSchema>;

const agentResponseSchema: Schema = {
  type: SchemaType.OBJECT,
  required: ['action'],
  properties: {
    action: {
      type: SchemaType.STRING,
      format: 'enum',
      enum: ['click', 'type', 'scroll', 'ask', 'done'],
    },
    x: { type: SchemaType.NUMBER },
    y: { type: SchemaType.NUMBER },
    text: { type: SchemaType.STRING },
    prompt: { type: SchemaType.STRING },
    reasoning: { type: SchemaType.STRING },
  },
};

const buildPrompt = ({ objective, screenWidth, screenHeight, history }: AgentStepRequest): string => {
  const historyLines = history && history.length > 0
    ? `Recent actions (latest last):\n${history
        .slice(-10)
        .map((entry, index) => `${index + 1}. ${JSON.stringify(entry)}`)
        .join('\n')}`
    : 'No prior actions have been executed in this session.';

  return [
    'You are an automation agent driving the Creative Atlas web application for the user.',
    `Current objective: ${objective}`,
    `Screen resolution: ${screenWidth}x${screenHeight}. Coordinates must align with this screenshot.`,
    historyLines,
    'Return the next single UI action as JSON. Choose one of: "click", "type", "scroll", "ask", or "done".',
    'Use "ask" when you need additional human guidance. Include a "prompt" message explaining what you need from the user.',
    'Always provide the reasoning string explaining why the action progresses the goal.',
    'For "click" and "type" actions include absolute pixel coordinates {"x","y"}. Provide the complete text to insert for "type" actions.',
    'For "scroll" actions include coordinates indicating the viewport location to scroll toward.',
    'Respond with the raw JSON object only—do not include markdown fencing or additional commentary.',
  ].join('\n\n');
};

const extractJsonCandidate = (payload: unknown): Record<string, unknown> => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Gemini returned an empty response.');
  }

  const candidates = (payload as { response?: { candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }> } })
    .response?.candidates;

  if (!Array.isArray(candidates)) {
    throw new Error('Gemini response did not contain any candidates.');
  }

  for (const candidate of candidates) {
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) {
      continue;
    }

    for (const part of parts) {
      const text = typeof part?.text === 'string' ? part.text.trim() : null;
      if (!text) {
        continue;
      }

      try {
        const parsed = JSON.parse(text) as Record<string, unknown>;
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (error) {
        console.warn('Failed to parse Gemini agent response', error, text);
      }
    }
  }

  throw new Error('Gemini did not return a valid JSON agent action.');
};

router.post(
  '/step',
  asyncHandler(async (req, res) => {
    const parsed = agentStepRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request payload.',
        details: parsed.error.flatten(),
      });
      return;
    }

    const payload = parsed.data;

    let model;
    try {
      const client = getGeminiClient();
      model = client.getGenerativeModel({ model: AGENT_MODEL_ID });
    } catch (error) {
      console.error('Failed to initialize Gemini client', error);
      res.status(500).json({
        error: 'Gemini agent integration is not configured on the server.',
      });
      return;
    }

    const prompt = buildPrompt(payload);

    try {
      const response = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: payload.screenshotBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: agentResponseSchema,
        },
      });

      const action = extractJsonCandidate(response);
      res.json(action);
    } catch (error) {
      console.error('Gemini agent request failed', error);
      res.status(500).json({
        error: 'Gemini agent request failed.',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }),
);

export default router;

import { Router } from 'express';
import {
  FunctionCallingMode,
  SchemaType,
  type FunctionDeclaration,
  type FunctionDeclarationSchema,
  type Schema,
  type ToolConfig,
  type Tool,
} from '@google/genai';
import { z } from 'zod';
import asyncHandler from '../utils/asyncHandler.js';
import { getGeminiClient } from '../utils/geminiClient.js';

const router = Router();

const AGENT_MODEL_ID = 'gemini-2.5-computer-use-preview-10-2025';
const ACTION_FUNCTION_NAME = 'ghost_agent_action';

const COMPUTER_USE_TOOL = {
  computerUse: {
    environment: 'ENVIRONMENT_BROWSER',
    excludedPredefinedFunctions: [
      'open_web_browser',
      'wait_5_seconds',
      'go_back',
      'go_forward',
      'search',
      'navigate',
      'hover_at',
      'type_text_at',
      'click_at',
      'scroll_document',
      'scroll_at',
      'key_combination',
      'drag_and_drop',
    ],
  },
} as unknown as Tool;

const agentResponseSchema: Schema = {
  type: SchemaType.OBJECT,
  required: ['action', 'reasoning'],
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

const ACTION_FUNCTION_DECLARATION: FunctionDeclaration = {
  name: ACTION_FUNCTION_NAME,
  description:
    'Report the next Creative Atlas UI action. Always populate the reasoning field with a concise justification.',
  parameters: agentResponseSchema as FunctionDeclarationSchema,
};

const FUNCTION_DECLARATIONS_TOOL: Tool = {
  functionDeclarations: [ACTION_FUNCTION_DECLARATION],
};

const TOOLS: Tool[] = [FUNCTION_DECLARATIONS_TOOL, COMPUTER_USE_TOOL];

const TOOL_CONFIG: ToolConfig = {
  functionCallingConfig: {
    mode: FunctionCallingMode.ANY,
    allowedFunctionNames: [ACTION_FUNCTION_NAME],
  },
};

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
    `Call the \"${ACTION_FUNCTION_NAME}\" tool with the next action. Choose one of: "click", "type", "scroll", "ask", or "done".`,
    'Use "ask" when you need additional human guidance. Include a "prompt" message explaining what you need from the user.',
    'Always include a concise reasoning string explaining how the action advances the objective.',
    'For "click" and "type" actions include absolute pixel coordinates {"x","y"}. Provide the full text to insert for "type" actions.',
    'For "scroll" actions set {"x","y"} to the viewport coordinates that should be brought into view.',
    'Do not return raw JSON or natural language answers—always call the tool.',
  ].join('\n\n');
};

const coerceNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

const extractAction = (payload: unknown): Record<string, unknown> => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Gemini returned an empty response.');
  }

  const candidates = (payload as {
    response?: {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: unknown;
            functionCall?: { name?: unknown; args?: Record<string, unknown> };
          }>;
        };
      }>;
    };
  }).response?.candidates;

  if (!Array.isArray(candidates)) {
    throw new Error('Gemini response did not contain any candidates.');
  }

  for (const candidate of candidates) {
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts) || parts.length === 0) {
      continue;
    }

    const reasoningText = parts
      .map((part) => (typeof part?.text === 'string' ? part.text.trim() : ''))
      .filter((text) => text.length > 0)
      .join(' ')
      .trim();

    for (const part of parts) {
      const functionCall = part?.functionCall;
      if (!functionCall || typeof functionCall !== 'object') {
        continue;
      }

      if (functionCall.name !== ACTION_FUNCTION_NAME) {
        continue;
      }

      const args = functionCall.args ?? {};
      const action = typeof args.action === 'string' ? args.action.trim() : '';

      if (!action) {
        throw new Error('Gemini agent action did not specify an action type.');
      }

      const reasoningArg = typeof args.reasoning === 'string' ? args.reasoning.trim() : '';
      const reasoning = reasoningArg || reasoningText;

      if (!reasoning) {
        throw new Error('Gemini agent action did not include reasoning.');
      }

      const x = coerceNumber(args.x);
      const y = coerceNumber(args.y);
      const text = typeof args.text === 'string' ? args.text : undefined;

      const actionPayload: Record<string, unknown> = {
        action,
        reasoning,
      };

      if (x !== undefined) {
        actionPayload.x = x;
      }

      if (y !== undefined) {
        actionPayload.y = y;
      }

      if (text !== undefined) {
        actionPayload.text = text;
      }

      for (const [key, value] of Object.entries(args)) {
        if (!(key in actionPayload)) {
          actionPayload[key] = value;
        }
      }

      return actionPayload;
    }

    if (reasoningText) {
      return {
        action: 'done',
        reasoning: reasoningText,
      };
    }
  }

  throw new Error('Gemini did not provide an agent action.');
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
      model = client.getGenerativeModel({
        model: AGENT_MODEL_ID,
        tools: TOOLS,
        toolConfig: TOOL_CONFIG,
      });
    } catch (error) {
      console.error('Failed to initialize Gemini client', error);
      res.status(500).json({
        error: 'Gemini agent integration is not configured on the server.',
      });
      return;
    }

    const prompt = buildPrompt(payload);

    try {
      const response = await model.generateContent([
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
        ]);

      const action = extractAction(response);
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

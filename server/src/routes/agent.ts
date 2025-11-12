import { Router } from 'express';
import {
  FunctionCallingMode,
  SchemaType,
  type FunctionDeclaration,
  type FunctionDeclarationSchema,
  type Schema,
  type ToolConfig,
  type Tool,
} from '@google/generative-ai';
import { z } from 'zod';
import asyncHandler from '../utils/asyncHandler.js';
import { getGeminiClient } from '../utils/geminiClient.js';

const router = Router();

const AGENT_MODEL_ID = 'gemini-2.5-computer-use-preview-10-2025';
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

const MAX_MODEL_COORDINATE = 1000;

const createCoordinateSchema = (description: string): Schema => ({
  type: SchemaType.NUMBER,
  description,
});

const createReasoningSchema = (description: string): Schema => ({
  type: SchemaType.STRING,
  description,
});

const CLICK_ELEMENT_FUNCTION: FunctionDeclaration = {
  name: 'click_element',
  description:
    'Click the Creative Atlas UI at the provided 1000x1000 grid coordinates (0 = top/left, 1000 = bottom/right).',
  parameters: {
    type: SchemaType.OBJECT,
    required: ['x', 'y', 'reasoning'],
    properties: {
      x: createCoordinateSchema('Horizontal position within the 1000x1000 grid.'),
      y: createCoordinateSchema('Vertical position within the 1000x1000 grid.'),
      reasoning: createReasoningSchema('Explain how this click advances the objective.'),
    },
  } as FunctionDeclarationSchema,
};

const TYPE_TEXT_FUNCTION: FunctionDeclaration = {
  name: 'type_text',
  description:
    'Type text at the given 1000x1000 grid coordinates. Include the full text to insert into the focused element.',
  parameters: {
    type: SchemaType.OBJECT,
    required: ['x', 'y', 'text', 'reasoning'],
    properties: {
      x: createCoordinateSchema('Horizontal position within the 1000x1000 grid.'),
      y: createCoordinateSchema('Vertical position within the 1000x1000 grid.'),
      text: {
        type: SchemaType.STRING,
        description: 'Exact text to enter at the target element.',
      },
      reasoning: createReasoningSchema('Explain how this typing advances the objective.'),
    },
  } as FunctionDeclarationSchema,
};

const SCROLL_VIEWPORT_FUNCTION: FunctionDeclaration = {
  name: 'scroll_viewport',
  description:
    'Scroll the viewport so the provided 1000x1000 grid coordinates move into view.',
  parameters: {
    type: SchemaType.OBJECT,
    required: ['x', 'y', 'reasoning'],
    properties: {
      x: createCoordinateSchema('Horizontal position within the 1000x1000 grid to bring into view.'),
      y: createCoordinateSchema('Vertical position within the 1000x1000 grid to bring into view.'),
      reasoning: createReasoningSchema('Explain why this scroll is needed.'),
    },
  } as FunctionDeclarationSchema,
};

const ASK_HUMAN_FUNCTION: FunctionDeclaration = {
  name: 'ask_human',
  description: 'Request clarification or additional input from the human collaborator.',
  parameters: {
    type: SchemaType.OBJECT,
    required: ['prompt', 'reasoning'],
    properties: {
      prompt: {
        type: SchemaType.STRING,
        description: 'Message to display to the human for guidance.',
      },
      reasoning: createReasoningSchema('Explain why human guidance is required.'),
    },
  } as FunctionDeclarationSchema,
};

const COMPLETE_OBJECTIVE_FUNCTION: FunctionDeclaration = {
  name: 'complete_objective',
  description: 'Declare that the current objective is complete and summarize the outcome.',
  parameters: {
    type: SchemaType.OBJECT,
    required: ['reasoning'],
    properties: {
      reasoning: createReasoningSchema('Summarize the work performed and why the objective is complete.'),
    },
  } as FunctionDeclarationSchema,
};

const FUNCTION_DECLARATIONS_TOOL: Tool = {
  functionDeclarations: [
    CLICK_ELEMENT_FUNCTION,
    TYPE_TEXT_FUNCTION,
    SCROLL_VIEWPORT_FUNCTION,
    ASK_HUMAN_FUNCTION,
    COMPLETE_OBJECTIVE_FUNCTION,
  ],
};

const TOOLS: Tool[] = [FUNCTION_DECLARATIONS_TOOL, COMPUTER_USE_TOOL];

const TOOL_CONFIG: ToolConfig = {
  functionCallingConfig: {
    mode: FunctionCallingMode.ANY,
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
    `Screen resolution: ${screenWidth}x${screenHeight}. Internally you must reason on a 1000x1000 grid and the server will scale coordinates to the actual resolution.`,
    historyLines,
    'Call one of the available tools to take your next step:',
    '- `click_element({ x, y, reasoning })` to click a UI element at 1000x1000 coordinates.',
    '- `type_text({ x, y, text, reasoning })` to focus a field at 1000x1000 coordinates and enter the provided text.',
    '- `scroll_viewport({ x, y, reasoning })` to scroll until the coordinate is visible.',
    '- `ask_human({ prompt, reasoning })` to request extra guidance.',
    '- `complete_objective({ reasoning })` when the task is finished.',
    'Always populate the `reasoning` field with a concise explanation of how the action advances the objective.',
    'Only emit function calls—do not respond with plain text or JSON outside the defined tool structure.',
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

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const scaleCoordinate = (value: number | undefined, dimension: number): number | undefined => {
  if (value === undefined || !Number.isFinite(value)) {
    return undefined;
  }

  const normalized = clamp(value, 0, MAX_MODEL_COORDINATE) / MAX_MODEL_COORDINATE;
  return Math.round(normalized * Math.max(dimension - 1, 0));
};

const coerceString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return undefined;
};

const extractAction = (payload: unknown, request: AgentStepRequest): Record<string, unknown> => {
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

      const args = functionCall.args ?? {};
      const reasoning = coerceString(args.reasoning) ?? reasoningText;

      if (!reasoning) {
        throw new Error('Gemini agent action did not include reasoning.');
      }

      switch (functionCall.name) {
        case CLICK_ELEMENT_FUNCTION.name: {
          const x = scaleCoordinate(coerceNumber(args.x), request.screenWidth);
          const y = scaleCoordinate(coerceNumber(args.y), request.screenHeight);

          if (x === undefined || y === undefined) {
            throw new Error('Gemini click action did not include valid coordinates.');
          }

          return {
            action: 'click',
            reasoning,
            x,
            y,
          };
        }
        case TYPE_TEXT_FUNCTION.name: {
          const x = scaleCoordinate(coerceNumber(args.x), request.screenWidth);
          const y = scaleCoordinate(coerceNumber(args.y), request.screenHeight);
          const text = coerceString(args.text);

          if (x === undefined || y === undefined) {
            throw new Error('Gemini type action did not include valid coordinates.');
          }

          if (!text) {
            throw new Error('Gemini type action did not include text to type.');
          }

          return {
            action: 'type',
            reasoning,
            x,
            y,
            text,
          };
        }
        case SCROLL_VIEWPORT_FUNCTION.name: {
          const x = scaleCoordinate(coerceNumber(args.x), request.screenWidth);
          const y = scaleCoordinate(coerceNumber(args.y), request.screenHeight);

          if (x === undefined || y === undefined) {
            throw new Error('Gemini scroll action did not include valid coordinates.');
          }

          return {
            action: 'scroll',
            reasoning,
            x,
            y,
          };
        }
        case ASK_HUMAN_FUNCTION.name: {
          const prompt = coerceString(args.prompt);

          if (!prompt) {
            throw new Error('Gemini ask action did not include a prompt for the human.');
          }

          return {
            action: 'ask',
            reasoning,
            prompt,
          };
        }
        case COMPLETE_OBJECTIVE_FUNCTION.name: {
          return {
            action: 'done',
            reasoning,
          };
        }
        default:
          break;
      }
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
        tools: TOOLS,
        toolConfig: TOOL_CONFIG,
      });

      const action = extractAction(response, payload);
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

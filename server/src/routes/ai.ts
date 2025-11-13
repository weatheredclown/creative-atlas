import { Router } from 'express';
import {
  type GenerateContentConfig,
  type GenerateContentResponse,
  type GoogleGenAI,
  HarmCategory,
  HarmBlockThreshold,
  BlockedReason,
  FinishReason,
  HarmProbability,
} from '@google/genai';
import { z } from 'zod';
import asyncHandler from '../utils/asyncHandler.js';
import { extractTextFromResponse } from './geminiResponse.js';
import { getGeminiClient } from '../utils/geminiClient.js';

const router = Router();

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

type SafetyRating = {
  category?: HarmCategory | string;
  probability?: HarmProbability | string;
};

type PromptFeedback = {
  blockReason?: BlockedReason | string;
  blockReasonMessage?: string;
  safetyRatings?: SafetyRating[];
};

type Candidate = {
  finishReason?: FinishReason | string;
  safetyRatings?: SafetyRating[];
};

const normalizeBlockReason = (reason: unknown): BlockedReason | null => {
  if (typeof reason !== 'string') {
    return null;
  }

  if (Object.values(BlockedReason).includes(reason as BlockedReason)) {
    return reason as BlockedReason;
  }

  return null;
};

const normalizeFinishReason = (reason: unknown): FinishReason | null => {
  if (typeof reason !== 'string') {
    return null;
  }

  if (Object.values(FinishReason).includes(reason as FinishReason)) {
    return reason as FinishReason;
  }

  return null;
};

const toSafetyRatings = (input: unknown): SafetyRating[] => {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((rating): rating is Record<string, unknown> => Boolean(rating) && typeof rating === 'object')
    .map((rating) => ({
      category:
        typeof (rating as { category?: unknown }).category === 'string'
          ? ((rating as { category: HarmCategory | string }).category as HarmCategory | string)
          : undefined,
      probability:
        typeof (rating as { probability?: unknown }).probability === 'string'
          ? ((rating as { probability: HarmProbability | string }).probability as HarmProbability | string)
          : undefined,
    }));
};

const SAFETY_FINISH_REASONS = new Set<FinishReason | string>([
  FinishReason.SAFETY,
  FinishReason.BLOCKLIST,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.RECITATION,
  FinishReason.SPII,
  FinishReason.MALFORMED_FUNCTION_CALL,
  FinishReason.OTHER,
  'LANGUAGE',
  'IMAGE_SAFETY',
]);

const formatEnumLabel = (value: string | undefined | null, prefixToStrip: string): string | null => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const withoutPrefix = value.startsWith(prefixToStrip) ? value.slice(prefixToStrip.length) : value;
  return withoutPrefix
    .toLowerCase()
    .split('_')
    .filter((segment) => segment.length > 0)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(' ');
};

const describeProbability = (probability?: HarmProbability | string): string | null => {
  if (!probability || typeof probability !== 'string') {
    return null;
  }

  switch (probability) {
    case HarmProbability.NEGLIGIBLE:
      return 'negligible risk';
    case HarmProbability.LOW:
      return 'low risk';
    case HarmProbability.MEDIUM:
      return 'medium risk';
    case HarmProbability.HIGH:
      return 'high risk';
    default:
      return `${probability.toLowerCase().replace(/_/g, ' ')} risk`;
  }
};

const buildSafetyCategorySummary = (ratings: SafetyRating[]): string[] => {
  return ratings.map((rating) => {
    const label = formatEnumLabel(rating.category, 'HARM_CATEGORY_') ?? 'unspecified content category';
    const probability = describeProbability(rating.probability);

    const descriptors = [probability].filter((part): part is string => typeof part === 'string' && part.length > 0);
    const descriptorText = descriptors.length > 0 ? ` (${descriptors.join(', ')})` : '';

    return `${label}${descriptorText}`;
  });
};

const mergeSafetyRatings = (sources: SafetyRating[][]): SafetyRating[] => {
  const combined: SafetyRating[] = [];

  for (const group of sources) {
    for (const rating of group) {
      if (!rating.category) {
        combined.push({ ...rating });
        continue;
      }

      const existingIndex = combined.findIndex((candidate) => candidate.category === rating.category);

      if (existingIndex === -1) {
        combined.push({ ...rating });
        continue;
      }

      const existing = combined[existingIndex];
      combined[existingIndex] = {
        ...existing,
        probability: rating.probability ?? existing.probability,
      };
    }
  }

  return combined;
};

const extractPromptFeedback = (response: GenerateContentResponse): PromptFeedback | null => {
  const feedback = (response as { promptFeedback?: unknown }).promptFeedback;
  if (!feedback || typeof feedback !== 'object') {
    return null;
  }

  const blockReason = normalizeBlockReason((feedback as { blockReason?: unknown }).blockReason);
  const blockReasonMessage = (feedback as { blockReasonMessage?: unknown }).blockReasonMessage;
  const safetyRatings = toSafetyRatings((feedback as { safetyRatings?: unknown }).safetyRatings);

  return {
    blockReason: blockReason ?? undefined,
    blockReasonMessage: typeof blockReasonMessage === 'string' ? blockReasonMessage : undefined,
    safetyRatings,
  };
};

const extractCandidateIssues = (response: GenerateContentResponse): Candidate[] => {
  const candidates = (response as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates)) {
    return [];
  }

  return candidates
    .filter((candidate): candidate is Candidate => Boolean(candidate) && typeof candidate === 'object')
    .map((candidate) => ({
      finishReason: normalizeFinishReason((candidate as { finishReason?: unknown }).finishReason) ??
        (typeof (candidate as { finishReason?: unknown }).finishReason === 'string'
          ? ((candidate as { finishReason: string }).finishReason as string)
          : undefined),
      safetyRatings: toSafetyRatings((candidate as { safetyRatings?: unknown }).safetyRatings),
    }));
};

const resolveSafetyIssue = (response: GenerateContentResponse):
  | {
      message: string;
      details: {
        reason: string;
        categories: { category: string; label?: string; probability?: string; probabilityLabel?: string }[];
        finishReasons: string[];
        blockMessage?: string;
      };
    }
  | null => {
  const promptFeedback = extractPromptFeedback(response);
  const candidateIssues = extractCandidateIssues(response);

  const promptBlocked = Boolean(
    promptFeedback?.blockReason &&
      promptFeedback.blockReason !== BlockedReason.BLOCKED_REASON_UNSPECIFIED,
  );

  const candidateFinishReasons = Array.from(
    new Set(
      candidateIssues
        .map((issue) => issue.finishReason)
        .filter((reason): reason is string => typeof reason === 'string' && reason.length > 0),
    ),
  );

  const candidateSafetyRatings = candidateIssues.map((issue) => issue.safetyRatings ?? []);
  const allRatings = mergeSafetyRatings([
    promptFeedback?.safetyRatings ?? [],
    ...candidateSafetyRatings,
  ]);

  const hasSafetyFinishReason = candidateFinishReasons.some((reason) => SAFETY_FINISH_REASONS.has(reason));

  const shouldBlock = promptBlocked || hasSafetyFinishReason;

  if (!shouldBlock) {
    return null;
  }

  const categories = allRatings;
  const categorySummaries = buildSafetyCategorySummary(categories);

  const blockReason = promptFeedback?.blockReason ?? (candidateFinishReasons[0] ?? 'UNKNOWN');
  const blockReasonMessage = promptFeedback?.blockReasonMessage;

  let message = blockReasonMessage?.trim() ?? '';
  if (!message) {
    const hasSpecificCategory = categorySummaries.some(
      (summary) => !summary.toLowerCase().startsWith('unspecified content category'),
    );

    if (categorySummaries.length > 0 && hasSpecificCategory) {
      message = `Gemini blocked this request because it flagged the prompt for ${categorySummaries.join(' and ')}.`;
    } else {
      message = 'Gemini blocked this request for safety reasons.';
    }
  }

  const sanitizedCategories = categories.map((rating) => ({
    category:
      typeof rating.category === 'string' && rating.category.length > 0
        ? rating.category
        : 'HARM_CATEGORY_UNSPECIFIED',
    probability: rating.probability,
    probabilityLabel: describeProbability(rating.probability) ?? undefined,
    label: formatEnumLabel(rating.category, 'HARM_CATEGORY_') ?? undefined,
  }));

  return {
    message,
    details: {
      reason: typeof blockReason === 'string' && blockReason.length > 0 ? blockReason : 'UNKNOWN',
      blockMessage: blockReasonMessage?.trim() || undefined,
      categories: sanitizedCategories,
      finishReasons: candidateFinishReasons,
    },
  };
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
      client = getGeminiClient();
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

    const safetySettings = [
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
    ];

    const generationConfig: GenerateContentConfig = {
      safetySettings,
    };

    if (config) {
      if (config.temperature !== undefined) {
        generationConfig.temperature = config.temperature;
      }

      if (config.topP !== undefined) {
        generationConfig.topP = config.topP;
      }

      if (config.topK !== undefined) {
        generationConfig.topK = config.topK;
      }

      if (config.maxOutputTokens !== undefined) {
        generationConfig.maxOutputTokens = config.maxOutputTokens;
      }

      if (config.responseMimeType !== undefined) {
        generationConfig.responseMimeType = config.responseMimeType;
      }

      if (config.responseSchema !== undefined) {
        generationConfig.responseSchema = config.responseSchema as GenerateContentConfig['responseSchema'];
      }
    }

    try {
      const response = await client.models.generateContent({
        model,
        contents,
        ...generationConfig,
      });
      const safetyIssue = resolveSafetyIssue(response);

      if (safetyIssue) {
        console.warn('Gemini blocked request for safety reasons', safetyIssue.details);
        res.status(400).json({
          error: safetyIssue.message,
          details: safetyIssue.details,
        });
        return;
      }

      const text = extractTextFromResponse(response);

      if (!text) {
        const finishReason = response.candidates?.[0]?.finishReason;
        const safetyRatings = response.candidates?.[0]?.safetyRatings;

        console.log(
          'Gemini returned an empty text response.',
          `Finish Reason: ${finishReason ?? 'N/A'}`,
          'Safety Ratings:',
          JSON.stringify(safetyRatings, null, 2),
        );
        res.status(502).json({
          error: 'Gemini returned an empty response.',
          details: {
            finishReason,
            safetyRatings,
          },
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

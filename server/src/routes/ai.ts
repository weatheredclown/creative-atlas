import { Router } from 'express';
import {
  GoogleGenAI,
  type GenerationConfig,
  type GenerateContentResponse,
  HarmCategory,
  HarmBlockThreshold,
  BlockedReason,
  FinishReason,
  HarmProbability,
  HarmSeverity,
} from '@google/genai';
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

type SafetyRating = {
  blocked?: boolean;
  category?: HarmCategory;
  probability?: HarmProbability;
  severity?: HarmSeverity;
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
    .filter((rating): rating is Partial<SafetyRating> => Boolean(rating) && typeof rating === 'object')
    .map((rating) => ({
      blocked: typeof (rating as { blocked?: unknown }).blocked === 'boolean' ? (rating as { blocked: boolean }).blocked : undefined,
      category:
        typeof (rating as { category?: unknown }).category === 'string'
          ? ((rating as { category: HarmCategory }).category as HarmCategory)
          : undefined,
      probability:
        typeof (rating as { probability?: unknown }).probability === 'string'
          ? ((rating as { probability: HarmProbability }).probability as HarmProbability)
          : undefined,
      severity:
        typeof (rating as { severity?: unknown }).severity === 'string'
          ? ((rating as { severity: HarmSeverity }).severity as HarmSeverity)
          : undefined,
    }));
};

const SAFETY_FINISH_REASONS = new Set<FinishReason | string>([
  FinishReason.SAFETY,
  FinishReason.BLOCKLIST,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.RECITATION,
  FinishReason.SPII,
  FinishReason.IMAGE_SAFETY,
  FinishReason.MALFORMED_FUNCTION_CALL,
  FinishReason.OTHER,
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

const describeProbability = (probability?: HarmProbability): string | null => {
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
      return null;
  }
};

const describeSeverity = (severity?: HarmSeverity): string | null => {
  switch (severity) {
    case HarmSeverity.HARM_SEVERITY_NEGLIGIBLE:
      return 'negligible severity';
    case HarmSeverity.HARM_SEVERITY_LOW:
      return 'low severity';
    case HarmSeverity.HARM_SEVERITY_MEDIUM:
      return 'medium severity';
    case HarmSeverity.HARM_SEVERITY_HIGH:
      return 'high severity';
    default:
      return null;
  }
};

const buildSafetyCategorySummary = (ratings: SafetyRating[]): string[] => {
  return ratings.map((rating) => {
    const label = formatEnumLabel(rating.category, 'HARM_CATEGORY_') ?? 'unspecified content category';
    const probability = describeProbability(rating.probability);
    const severity = describeSeverity(rating.severity);

    const descriptors = [probability, severity].filter((part): part is string => typeof part === 'string' && part.length > 0);
    const descriptorText = descriptors.length > 0 ? ` (${descriptors.join(', ')})` : '';

    return `${label}${descriptorText}`;
  });
};

const mergeSafetyRatings = (sources: SafetyRating[][]): SafetyRating[] => {
  const combined: SafetyRating[] = [];

  for (const group of sources) {
    for (const rating of group) {
      if (!rating.category) {
        combined.push(rating);
        continue;
      }

      const existingIndex = combined.findIndex((candidate) => candidate.category === rating.category);

      if (existingIndex === -1) {
        combined.push(rating);
        continue;
      }

      const existing = combined[existingIndex];
      combined[existingIndex] = {
        ...existing,
        blocked: existing.blocked || rating.blocked,
        probability: rating.probability ?? existing.probability,
        severity: rating.severity ?? existing.severity,
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
  | { message: string; details: { reason: string; categories: { category: string; blocked: boolean; probability?: string; severity?: string }[]; finishReasons: string[]; blockMessage?: string } }
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

  const blockedRatings = allRatings.filter((rating) => rating.blocked);
  const hasSafetyFinishReason = candidateFinishReasons.some((reason) => SAFETY_FINISH_REASONS.has(reason));

  const shouldBlock = promptBlocked || blockedRatings.length > 0 || hasSafetyFinishReason;

  if (!shouldBlock) {
    return null;
  }

  const categories = blockedRatings.length > 0 ? blockedRatings : allRatings;
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
    category: rating.category ?? 'HARM_CATEGORY_UNSPECIFIED',
    blocked: Boolean(rating.blocked),
    probability: rating.probability,
    probabilityLabel: describeProbability(rating.probability) ?? undefined,
    severity: rating.severity,
    severityLabel: describeSeverity(rating.severity) ?? undefined,
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

    const payload: Parameters<typeof client.models.generateContent>[0] = {
      model,
      contents,
      safetySettings,
    };

    if (config) {
      payload.config = config as GenerationConfig;
    }

    try {
      const response = await client.models.generateContent(payload);
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
        console.log(
          'Gemini returned an empty text response. Full response object:',
          JSON.stringify(response, null, 2),
        );
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

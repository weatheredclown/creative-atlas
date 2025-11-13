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

const DEFAULT_MODEL = 'gemini-2.5-flash';

const DEFAULT_SAFETY_SETTINGS: GenerateContentConfig['safetySettings'] = [
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

type SceneDialogueCharacterProfile = {
  id?: string;
  name: string;
  summary?: string;
  bio?: string;
  traits?: string[];
};

type SceneDialogueLine = {
  speaker?: string;
  line: string;
  direction?: string;
};

type SceneDialogueResult = {
  synopsis?: string;
  beats?: string[];
  dialogue: SceneDialogueLine[];
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
  model: z.string().trim().min(1).default(DEFAULT_MODEL),
  prompt: z.string().trim().min(1, 'Prompt is required.'),
  config: generationConfigSchema.optional(),
});

const MAX_SCENE_PROMPT_LENGTH = 2600;
const MAX_SCENE_SUMMARY_LENGTH = 2000;
const MAX_BEAT_COUNT = 10;
const MAX_BEAT_LENGTH = 650;
const MAX_BEATS_SECTION_LENGTH = 3000;
const MAX_CAST_DETAIL_LENGTH = 550;
const MAX_CAST_SECTION_LENGTH = 3400;
const MAX_TRAITS = 16;

const sceneDialogueCharacterSchema = z
  .object({
    id: z.string().trim().min(1).max(200).optional(),
    name: z.string().trim().min(1, 'Character name is required.').max(200),
    summary: z.string().trim().max(4000).optional(),
    bio: z.string().trim().max(4000).optional(),
    traits: z
      .array(z.string().trim().min(1).max(200))
      .max(MAX_TRAITS)
      .optional(),
  })
  .strict();

const sceneDialogueRequestSchema = z
  .object({
    model: z.string().trim().min(1).default(DEFAULT_MODEL),
    projectTitle: z.string().trim().min(1, 'Project title is required.').max(500),
    sceneTitle: z.string().trim().min(1, 'Scene title is required.').max(500),
    scenePrompt: z
      .string()
      .trim()
      .min(1, 'Scene prompt is required.')
      .max(6000, 'Scene prompt is too long.'),
    sceneSummary: z.string().trim().max(6000).optional(),
    characters: z
      .array(sceneDialogueCharacterSchema)
      .min(2, 'Provide at least two characters to stage dialogue.')
      .max(12, 'Too many characters provided for a single scene.'),
    existingBeats: z
      .array(z.string().trim().min(1))
      .max(MAX_BEAT_COUNT)
      .optional(),
  })
  .strict();

const sceneDialogueSchema = {
  type: 'object',
  properties: {
    synopsis: {
      type: 'string',
      description: '1-2 sentence recap of the scene outcome.',
    },
    beats: {
      type: 'array',
      description: 'Ordered beat summaries to expand the scene.',
      items: {
        type: 'string',
        description: 'Single beat or turning point description.',
      },
    },
    dialogue: {
      type: 'array',
      description: 'Ordered dialogue lines with optional stage direction metadata.',
      items: {
        type: 'object',
        properties: {
          speaker: {
            type: 'string',
            description: 'Name of the speaking character.',
          },
          line: {
            type: 'string',
            description: 'Spoken line of dialogue.',
          },
          direction: {
            type: 'string',
            description: 'Optional stage direction or emotional cue.',
          },
        },
        required: ['line'],
      },
    },
  },
  required: ['dialogue'],
} as const;

const sceneDialogueResponseSchema = z
  .object({
    synopsis: z.string().optional(),
    beats: z.array(z.string()).optional(),
    dialogue: z
      .array(
        z.object({
          speaker: z.string().optional(),
          line: z.string(),
          direction: z.string().optional(),
        }),
      )
      .min(1, 'Dialogue payload did not include any lines.'),
  })
  .strict();

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

const truncateText = (text: string | undefined, maxLength: number): string => {
  if (!text || maxLength <= 0) {
    return '';
  }

  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  if (maxLength === 1) {
    return '…';
  }

  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
};

const sanitizeSceneDialogueCharacters = (
  characters: SceneDialogueCharacterProfile[],
): SceneDialogueCharacterProfile[] => {
  return characters.map((character) => {
    const summary = character.summary?.trim();
    const bio = character.bio?.trim();
    const traits = Array.isArray(character.traits)
      ? character.traits
          .map((trait) => trait.trim())
          .filter((trait) => trait.length > 0)
          .slice(0, MAX_TRAITS)
      : undefined;

    return {
      id: character.id?.trim() || undefined,
      name: character.name.trim(),
      summary: summary && summary.length > 0 ? summary : undefined,
      bio: bio && bio.length > 0 ? bio : undefined,
      traits: traits && traits.length > 0 ? traits : undefined,
    } satisfies SceneDialogueCharacterProfile;
  });
};

const formatCastProfiles = (profiles: SceneDialogueCharacterProfile[]): string => {
  if (profiles.length === 0) {
    return 'No additional character biography provided.';
  }

  const formatted = profiles
    .map((profile) => {
      const segments: string[] = [];

      if (profile.summary && profile.summary.length > 0) {
        segments.push(`Summary: ${truncateText(profile.summary, MAX_CAST_DETAIL_LENGTH)}`);
      }

      if (profile.bio && profile.bio.length > 0) {
        segments.push(`Bio: ${truncateText(profile.bio, MAX_CAST_DETAIL_LENGTH)}`);
      }

      if (profile.traits && profile.traits.length > 0) {
        const trimmedTraits = truncateText(profile.traits.join('; '), MAX_CAST_DETAIL_LENGTH);
        segments.push(`Traits: ${trimmedTraits}`);
      }

      const detail = segments.length > 0 ? segments.join(' | ') : 'No additional detail provided.';
      return `- ${profile.name}: ${detail}`;
    })
    .join('\n');

  return truncateText(formatted, MAX_CAST_SECTION_LENGTH);
};

const formatBeatOutline = (existingBeats: string[] | undefined): string => {
  if (!existingBeats || existingBeats.length === 0) {
    return 'No prior beats logged.';
  }

  const beats = existingBeats
    .map((beat) => beat.trim())
    .filter((beat) => beat.length > 0)
    .slice(0, MAX_BEAT_COUNT)
    .map((beat, index) => `${index + 1}. ${truncateText(beat, MAX_BEAT_LENGTH)}`)
    .join('\n');

  return truncateText(beats, MAX_BEATS_SECTION_LENGTH);
};

const buildSceneDialoguePrompt = ({
  projectTitle,
  sceneTitle,
  scenePrompt,
  sceneSummary,
  characters,
  existingBeats,
}: {
  projectTitle: string;
  sceneTitle: string;
  scenePrompt: string;
  sceneSummary?: string;
  characters: SceneDialogueCharacterProfile[];
  existingBeats?: string[];
}): string => {
  const sanitizedCharacters = sanitizeSceneDialogueCharacters(characters);
  const castBlock = formatCastProfiles(sanitizedCharacters);
  const beatsBlock = formatBeatOutline(existingBeats);
  const summaryBlock = sceneSummary && sceneSummary.trim().length > 0
    ? truncateText(sceneSummary, MAX_SCENE_SUMMARY_LENGTH)
    : 'None provided.';

  return `
You are Dialogue Forge, an Atlas Intelligence guide who writes grounded scene dialogue.

Project: ${projectTitle}
Scene title: ${sceneTitle}

Scene prompt:
${truncateText(scenePrompt, MAX_SCENE_PROMPT_LENGTH)}

Context summary: ${summaryBlock}

Cast profiles:
${castBlock}

Existing beat outline:
${beatsBlock}

Deliver a JSON payload with:
- synopsis: 1-2 sentences describing the outcome of this exchange.
- beats: 3-5 bullet summaries for potential follow-up beats.
- dialogue: ordered lines containing the speaking character name, the spoken line, and an optional stage direction string describing tone or action.

Keep the exchange tightly focused, respect each character's established voice, and avoid narrating camera directions. Stage directions should be short present-tense cues (e.g., "softly", "paces", "grips the railing").
`;
};

const sanitizeSceneDialogueResult = (payload: unknown): SceneDialogueResult => {
  const parsed = sceneDialogueResponseSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error('Gemini response did not match the expected scene dialogue format.');
  }

  const synopsis = parsed.data.synopsis?.trim();
  const beats = parsed.data.beats
    ?.map((beat) => beat.trim())
    .filter((beat) => beat.length > 0);

  const dialogue = parsed.data.dialogue
    .map((entry): SceneDialogueLine | null => {
      const line = entry.line.trim();
      if (line.length === 0) {
        return null;
      }

      const speaker = entry.speaker?.trim();
      const direction = entry.direction?.trim();

      const sanitized: SceneDialogueLine = {
        line,
        ...(speaker && speaker.length > 0 ? { speaker } : {}),
        ...(direction && direction.length > 0 ? { direction } : {}),
      };

      return sanitized;
    })
    .filter((entry): entry is SceneDialogueLine => entry !== null);

  if (dialogue.length === 0) {
    throw new Error('Gemini response did not include any usable dialogue lines.');
  }

  return {
    synopsis: synopsis && synopsis.length > 0 ? synopsis : undefined,
    beats: beats && beats.length > 0 ? beats : undefined,
    dialogue,
  } satisfies SceneDialogueResult;
};

router.post(
  '/dialogue/scene',
  asyncHandler(async (req, res) => {
    const parsed = sceneDialogueRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request payload.',
        details: parsed.error.flatten(),
      });
      return;
    }

    const {
      model,
      projectTitle,
      sceneTitle,
      scenePrompt,
      sceneSummary,
      characters,
      existingBeats,
    } = parsed.data;

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

    const prompt = buildSceneDialoguePrompt({
      projectTitle,
      sceneTitle,
      scenePrompt,
      sceneSummary,
      characters,
      existingBeats,
    });

    const contents = [
      {
        role: 'user' as const,
        parts: [{ text: prompt }],
      },
    ];

    const generationConfig: GenerateContentConfig = {
      safetySettings: DEFAULT_SAFETY_SETTINGS,
      responseMimeType: 'application/json',
      responseSchema: sceneDialogueSchema as GenerateContentConfig['responseSchema'],
      temperature: 0.7,
      maxOutputTokens: 1536,
    };

    try {
      const response = await client.models.generateContent({
        model,
        contents,
        config: generationConfig,
      });

      const safetyIssue = resolveSafetyIssue(response);
      if (safetyIssue) {
        console.warn('Gemini blocked scene dialogue request for safety reasons', safetyIssue.details);
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
          'Gemini returned an empty scene dialogue response.',
          `Finish Reason: ${finishReason ?? 'N/A'}`,
          'Safety Ratings:',
          JSON.stringify(safetyRatings, null, 2),
        );
        res.status(502).json({
          error: 'Gemini returned an empty scene dialogue response.',
          details: {
            finishReason,
            safetyRatings,
          },
        });
        return;
      }

      let payload: SceneDialogueResult;
      try {
        const parsedPayload = JSON.parse(text) as unknown;
        payload = sanitizeSceneDialogueResult(parsedPayload);
      } catch (error) {
        console.error('Failed to parse Gemini scene dialogue payload', error);
        res.status(502).json({
          error: 'Gemini returned an invalid scene dialogue payload.',
          details: error instanceof Error ? error.message : 'Invalid scene dialogue payload format.',
        });
        return;
      }

      res.json(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Gemini error occurred.';
      console.error('Gemini scene dialogue request failed', message);
      res.status(502).json({
        error: 'Gemini request failed.',
        details: message,
      });
    }
  }),
);

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

    const generationConfig: GenerateContentConfig = {
      safetySettings: DEFAULT_SAFETY_SETTINGS,
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
        config: generationConfig,
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


import { SchemaType } from '@google/generative-ai';
import type { Artifact, ConlangLexeme, TemplateArtifactBlueprint } from '../types';
import { ArtifactType, TASK_STATE } from '../types';
import { createBlankMagicSystemData } from '../utils/magicSystem';
import { getGeminiErrorMessage, requestGeminiText } from './aiProxy';

const lexemeSchema = {
  type: SchemaType.OBJECT,
  properties: {
    lemma: {
      type: SchemaType.STRING,
      description: 'The base form of the word in the constructed language.'
    },
    pos: {
      type: SchemaType.STRING,
      description: 'The part of speech (e.g., \'noun\', \'verb\', \'adjective\').'
    },
    gloss: {
      type: SchemaType.STRING,
      description: 'A brief English definition or translation of the word.'
    },
    etymology: {
      type: SchemaType.STRING,
      description: 'A brief, plausible-sounding origin story for the word within the fictional world.'
    }
  },
  required: ['lemma', 'pos', 'gloss']
};

interface GeneratedProjectDetails {
  title: string;
  summary: string;
  tags: string[];
  artifacts: TemplateArtifactBlueprint[];
}

const GENERATED_ARTIFACT_TYPES: ArtifactType[] = [
  ArtifactType.Character,
  ArtifactType.Location,
  ArtifactType.Faction,
  ArtifactType.Scene,
  ArtifactType.Chapter,
  ArtifactType.Wiki,
  ArtifactType.Task,
  ArtifactType.MagicSystem,
  ArtifactType.Timeline,
];

const projectArtifactSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: {
      type: SchemaType.STRING,
      description: 'Artifact title. Should highlight a unique element such as a character, location, or lore entry.',
    },
    type: {
      type: SchemaType.STRING,
      description:
        `Artifact type. Choose from: ${GENERATED_ARTIFACT_TYPES.map((value) => `'${value}'`).join(', ')}.`,
    },
    summary: {
      type: SchemaType.STRING,
      description: '1-3 sentence pitch that captures the hook and role of this artifact.',
    },
    status: {
      type: SchemaType.STRING,
      description: "Optional status label such as 'idea', 'draft', or 'active'.",
    },
    tags: {
      type: SchemaType.ARRAY,
      description: 'Optional short tags (1-2 words) describing themes or functions.',
      items: {
        type: SchemaType.STRING,
        description: 'Single descriptive tag.',
      },
    },
  },
  required: ['title', 'type', 'summary'],
};

const projectBlueprintSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: {
      type: SchemaType.STRING,
      description:
        'A concise, compelling project title. Prefer proper nouns and limit to 60 characters.',
    },
    summary: {
      type: SchemaType.STRING,
      description:
        'A short project summary (2-3 sentences) highlighting the premise, tone, or core goal.',
    },
    tags: {
      type: SchemaType.ARRAY,
      description: '1-6 short descriptive tags that help classify the project.',
      items: {
        type: SchemaType.STRING,
        description: 'A single descriptive tag (one or two words).',
      },
    },
    artifacts: {
      type: SchemaType.ARRAY,
      description:
        '3-6 starter artifacts that would give the creator a head start. Focus on key characters, factions, locations, plot arcs, or lore documents.',
      items: projectArtifactSchema,
    },
  },
  required: ['title', 'summary'],
};

const quickFactInspirationSchema = {
  type: SchemaType.OBJECT,
  properties: {
    fact: {
      type: SchemaType.STRING,
      description:
        'A concise quick fact (1-2 sentences) that can be saved directly into the project lore.',
    },
    spark: {
      type: SchemaType.STRING,
      description:
        'An optional follow-up note that suggests how to elaborate on or apply the fact inside the atlas.',
    },
  },
  required: ['fact'],
};

export interface QuickFactInspiration {
  fact: string;
  spark?: string;
}

/**
 * Implements the "Conlang Smith" Atlas Intelligence guide.
 * Generates a batch of lexemes for a constructed language based on a theme.
 */
export const generateLexemes = async (
  conlangName: string,
  theme: string,
  existingLexemes: ConlangLexeme[]
): Promise<Omit<ConlangLexeme, 'id'>[]> => {
  const existingLemmas = existingLexemes.map(l => l.lemma).join(', ');

  const prompt = `
    You are Conlang Smith, an AI assistant for creative world-builders.
    Your task is to generate a batch of 5 new, creative, and consistent-sounding words (lexemes) for a constructed language (conlang).

    Conlang Name: ${conlangName}
    Theme for new words: ${theme}

    The language should have a consistent phonetic and aesthetic feel.
    Analyze the style of the existing words if any are provided.
    Do not generate words that are already in this list of existing lemmas: ${existingLemmas || 'None'}

    Generate 5 new lexemes related to the theme. For each lexeme, provide its lemma, part of speech (pos), a short English gloss, and a brief, plausible fictional etymology.
  `;

  try {
    const jsonText = (await requestGeminiText({
      prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.ARRAY,
          items: lexemeSchema,
        },
        temperature: 0.8,
      },
    })).trim();
    const generatedItems = JSON.parse(jsonText) as Omit<ConlangLexeme, 'id'>[];
    
    if (!Array.isArray(generatedItems)) {
        throw new Error('AI response is not a valid array.');
    }

    return generatedItems;

  } catch (error) {
    console.error('Error generating lexemes with Gemini:', error);
    const message = getGeminiErrorMessage(error, 'Failed to generate lexemes.');
    throw new Error(message);
  }
};

/**
 * Implements the "Lore Weaver" Atlas Intelligence guide.
 * Expands on a given summary for an artifact.
 */
export const generateProjectFromDescription = async (
  description: string,
): Promise<GeneratedProjectDetails> => {
  const prompt = `
    You are Project Architect, an AI assistant for creative world-builders.
    Given a detailed description of a creative project, distill it into the structured fields used by Creative Atlas.

    Description: ${description}

    Respond with JSON containing:
    - "title": A memorable title (max 60 characters).
    - "summary": A 2-3 sentence summary that captures the tone and focus.
    - "tags": 1-6 short descriptive tags (1-2 words each).
    - "artifacts": 3-6 starter artifacts. Each should include a title, summary, and type (choose from ${GENERATED_ARTIFACT_TYPES.join(
        ', ',
      )}). Mix characters, locations, factions, lore docs, plot beats, or tasks that would jump-start this project.

    Keep the tone inspiring but grounded. Tags should be lowercase words or hyphenated phrases.
  `;

  try {
    const jsonText = (await requestGeminiText({
      prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: projectBlueprintSchema,
        temperature: 0.6,
      },
    })).trim();
    if (!jsonText) {
      throw new Error('AI response was empty.');
    }

    const parsed = JSON.parse(jsonText) as Partial<GeneratedProjectDetails> | null;
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('AI response is not a valid object.');
    }

    const title = typeof parsed.title === 'string' ? parsed.title.trim() : '';
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
    if (!title || !summary) {
      throw new Error('AI response is missing required project details.');
    }

    const tags = Array.isArray(parsed.tags)
      ? Array.from(
          new Set(
            parsed.tags
              .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
              .filter((tag) => tag.length > 0),
          ),
        )
      : [];

    const artifacts = Array.isArray(parsed.artifacts)
      ? sanitizeGeneratedArtifacts(parsed.artifacts)
      : [];

    const enhancedArtifacts = await enhanceGeneratedArtifacts(artifacts);

    return {
      title,
      summary,
      tags,
      artifacts: enhancedArtifacts,
    };
  } catch (error) {
    console.error('Error generating project blueprint with Gemini:', error);
    const message = getGeminiErrorMessage(error, 'Failed to generate project details.');
    throw new Error(message);
  }
};

const sanitizeGeneratedArtifacts = (artifacts: TemplateArtifactBlueprint[]): TemplateArtifactBlueprint[] => {
  const seenTitles = new Set<string>();
  const sanitized: TemplateArtifactBlueprint[] = [];

  for (const item of artifacts) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const rawTitle = typeof item.title === 'string' ? item.title.trim() : '';
    const rawSummary = typeof item.summary === 'string' ? item.summary.trim() : '';
    const rawType = typeof item.type === 'string' ? item.type.trim().toLowerCase() : '';
    if (!rawTitle || !rawSummary || !rawType) {
      continue;
    }

    const type = GENERATED_ARTIFACT_TYPES.find((value) => value.toLowerCase() === rawType);
    if (!type) {
      continue;
    }

    const titleKey = rawTitle.toLowerCase();
    if (seenTitles.has(titleKey)) {
      continue;
    }

    const status = typeof item.status === 'string' ? item.status.trim() : undefined;
    const tags = Array.isArray(item.tags)
      ? Array.from(
          new Set(
            item.tags
              .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
              .filter((tag) => tag.length > 0),
          ),
        )
      : [];

    const blueprint: TemplateArtifactBlueprint = {
      title: rawTitle,
      summary: rawSummary,
      type,
    };

    if (status) {
      blueprint.status = status;
    }
    if (tags.length > 0) {
      blueprint.tags = tags;
    }

    sanitized.push(blueprint);
    seenTitles.add(titleKey);

    if (sanitized.length === 6) {
      break;
    }
  }

  return sanitized;
};

const MAX_QUICK_FACT_ARTIFACTS = 12;
const QUICK_FACT_TAG_SLUG = 'fact';
const QUICK_FACT_SUMMARY_LIMIT = 180;

const truncateForPrompt = (value: string, maxLength: number): string => {
  if (!value) {
    return '';
  }
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1).trimEnd()}\u2026`;
};

const isLikelyQuickFactArtifact = (artifact: Artifact): boolean => {
  if (artifact.type !== ArtifactType.Wiki) {
    return false;
  }
  return artifact.tags.some((tag) => tag.toLowerCase() === QUICK_FACT_TAG_SLUG);
};

const formatArtifactForQuickFactPrompt = (artifact: Artifact): string | null => {
  const title = typeof artifact.title === 'string' ? artifact.title.trim() : '';
  const summary = typeof artifact.summary === 'string' ? truncateForPrompt(artifact.summary.trim(), QUICK_FACT_SUMMARY_LIMIT) : '';
  const tags = Array.isArray(artifact.tags)
    ? artifact.tags
        .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
        .filter((tag) => tag.length > 0)
        .slice(0, 3)
    : [];

  const segments: string[] = [];
  const typeLabel = artifact.type ?? ArtifactType.Wiki;
  segments.push(`[${typeLabel}] ${title || 'Untitled Artifact'}`);

  if (summary) {
    segments.push(`Summary: ${summary}`);
  }

  if (tags.length > 0) {
    segments.push(`Tags: ${tags.join(', ')}`);
  }

  return segments.join(' — ');
};

const buildQuickFactArtifactContext = (artifacts: Artifact[]): string[] => {
  if (artifacts.length === 0) {
    return [];
  }

  const prioritized = [...artifacts].sort((a, b) => {
    const aIsQuickFact = isLikelyQuickFactArtifact(a);
    const bIsQuickFact = isLikelyQuickFactArtifact(b);
    if (aIsQuickFact !== bIsQuickFact) {
      return aIsQuickFact ? 1 : -1;
    }
    return a.title.localeCompare(b.title);
  });

  const seen = new Set<string>();
  const context: string[] = [];

  for (const artifact of prioritized) {
    const line = formatArtifactForQuickFactPrompt(artifact);
    if (!line) {
      continue;
    }

    const key = `${artifact.type}:${artifact.title}`.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    context.push(line);
    seen.add(key);

    if (context.length === MAX_QUICK_FACT_ARTIFACTS) {
      break;
    }
  }

  return context;
};

export const generateQuickFactInspiration = async ({
  projectTitle,
  artifacts,
}: {
  projectTitle: string;
  artifacts: Artifact[];
}): Promise<QuickFactInspiration> => {
  const safeTitle = projectTitle.trim().length > 0 ? projectTitle.trim() : 'Untitled Atlas Project';
  const artifactContext = buildQuickFactArtifactContext(artifacts);
  const formattedArtifacts =
    artifactContext.length > 0
      ? artifactContext.map((line, index) => `${index + 1}. ${line}`).join('\n')
      : 'No artifacts yet. Propose a fact that would kickstart this world-building effort.';

  const prompt = [
    'You are Quick Fact Scribe, an Atlas Intelligence guide who studies a creator\'s project artifacts.',
    'Using the context below, draft a concise quick fact that extends, deepens, or connects existing lore without contradicting it.',
    'Each quick fact should feel like a fresh beat of world knowledge the creator can drop into their atlas.',
    '',
    `Project Title: ${safeTitle}`,
    'Existing Artifacts:',
    formattedArtifacts,
    '',
    'Respond in JSON matching this schema:',
    '{',
    '  "fact": "1-2 sentence fact grounded in the artifacts.",',
    '  "spark": "Optional follow-up action or note for elaboration."',
    '}',
    '',
    'The fact should reference or build upon the supplied artifacts when possible. Keep the tone curious and inviting.',
  ].join('\n');

  try {
    const jsonText = (await requestGeminiText({
      prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: quickFactInspirationSchema,
        temperature: 0.7,
        maxOutputTokens: 256,
      },
    })).trim();

    if (!jsonText) {
      throw new Error('AI response was empty.');
    }

    const parsed = JSON.parse(jsonText) as Partial<QuickFactInspiration> | null;
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('AI response is not a valid object.');
    }

    const fact = typeof parsed.fact === 'string' ? parsed.fact.trim() : '';
    if (!fact) {
      throw new Error('AI response is missing a quick fact.');
    }

    const spark = typeof parsed.spark === 'string' ? parsed.spark.trim() : undefined;

    return {
      fact,
      spark: spark && spark.length > 0 ? spark : undefined,
    };
  } catch (error) {
    console.error('Error generating quick fact inspiration with Gemini:', error);
    const message = getGeminiErrorMessage(
      error,
      'Atlas Intelligence could not propose a quick fact right now.',
    );
    throw new Error(message);
  }
};

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'from',
  'this',
  'into',
  'their',
  'have',
  'will',
  'about',
  'over',
  'after',
  'before',
  'through',
  'while',
  'between',
  'whose',
  'where',
  'your',
  'they',
  'them',
  'been',
  'also',
  'story',
  'world',
  'each',
  'under',
  'across',
  'only',
  'other',
]);

const deriveKeywords = (text: string, max: number = 3): string[] => {
  if (!text) {
    return ['concept'];
  }

  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();

  const words = normalized
    .split(' ')
    .map((word) => word.trim())
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word));

  const counts = new Map<string, number>();
  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  const sorted = Array.from(counts.entries()).sort((a, b) => {
    if (b[1] === a[1]) {
      return a[0].localeCompare(b[0]);
    }
    return b[1] - a[1];
  });

  const keywords = sorted.slice(0, max).map(([word]) => word);

  if (keywords.length < max) {
    const fallbackWords = normalized
      .split(' ')
      .map((word) => word.trim())
      .filter((word) => word.length >= 4 && !keywords.includes(word));

    for (const word of fallbackWords) {
      if (!STOP_WORDS.has(word)) {
        keywords.push(word);
      }
      if (keywords.length === max) {
        break;
      }
    }
  }

  if (keywords.length === 0) {
    keywords.push('concept');
  }

  return keywords;
};

const titleCase = (value: string): string => {
  if (!value) {
    return '';
  }
  return value
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

const slugify = (value: string): string => {
  if (!value) {
    return 'artifact';
  }
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return slug.length > 0 ? slug : 'artifact';
};

const buildArtifactDataSkeleton = (
  blueprint: TemplateArtifactBlueprint,
  summary: string,
): TemplateArtifactBlueprint['data'] | undefined => {
  const keywords = deriveKeywords(summary);
  const baseSlug = slugify(blueprint.title);

  switch (blueprint.type) {
    case ArtifactType.Character:
      return {
        bio: summary,
        traits: keywords.map((keyword, index) => ({
          id: `${baseSlug}-trait-${index + 1}`,
          key: titleCase(keyword),
          value: `Explore how ${blueprint.title} embodies ${keyword} across the narrative.`,
        })),
      };
    case ArtifactType.Location:
      return {
        description: summary,
        features: keywords.map((keyword, index) => ({
          id: `${baseSlug}-feature-${index + 1}`,
          name: `${titleCase(keyword)} Landmark`,
          description: `Describe the ${keyword} aspect that defines ${blueprint.title}.`,
        })),
      };
    case ArtifactType.Wiki: {
      const sections = keywords
        .map((keyword) => `## ${titleCase(keyword)}\n- Capture the key lore beats connected to ${keyword}.`)
        .join('\n\n');
      return {
        content: `# ${blueprint.title}\n\n${summary}\n\n${sections || '## Key Details\n- Flesh out the cornerstone facts for this project.'}`,
      };
    }
    case ArtifactType.MagicSystem: {
      const data = createBlankMagicSystemData(blueprint.title);
      data.summary = summary;
      data.principles = keywords.map((keyword, index) => ({
        id: `${baseSlug}-principle-${index + 1}`,
        title: `${titleCase(keyword)} Principle`,
        focus: `Ways ${keyword} manifests in practice.`,
        description: `Detail how ${keyword} shapes the limits and costs of this magic.`,
        stability: index === 0 ? 'stable' : index === 1 ? 'volatile' : 'forbidden',
      }));
      data.sources = keywords.slice(0, 2).map((keyword, index) => ({
        id: `${baseSlug}-source-${index + 1}`,
        name: `${titleCase(keyword)} Source`,
        resonance: `Resonates with ${keyword} energy.`,
        capacity: 'Document how practitioners draw upon this source.',
        tells: 'List the sensory tells that reveal its use.',
      }));
      data.rituals = keywords.slice(0, 2).map((keyword, index) => ({
        id: `${baseSlug}-ritual-${index + 1}`,
        name: `${titleCase(keyword)} Rite`,
        tier: index === 0 ? 'Initiate' : 'Advanced',
        cost: 'Outline the material or narrative cost to perform this ritual.',
        effect: `Describe what ${keyword} accomplishes when invoked.`,
        failure: 'Explain what failure looks like and who bears the risk.',
      }));
      data.taboos = keywords.slice(0, 1).map((keyword, index) => ({
        id: `${baseSlug}-taboo-${index + 1}`,
        rule: `Never twist ${keyword} for selfish gain.`,
        consequence: 'Clarify the fallout when this taboo is broken.',
        restoration: 'List the steps required to atone or set things right.',
      }));
      data.fieldNotes = [
        'Catalog notable practitioners and how they bend the rules.',
        `List mysteries that still surround ${blueprint.title}.`,
      ];
      return data;
    }
    case ArtifactType.Timeline: {
      const events = keywords.map((keyword, index) => ({
        id: `${baseSlug}-event-${index + 1}`,
        date: '',
        title: `${titleCase(keyword)} Turning Point`,
        description: `Describe a pivotal moment tied to ${keyword}.`,
      }));
      if (events.length === 0) {
        events.push({
          id: `${baseSlug}-event-1`,
          date: '',
          title: 'Opening Beat',
          description: 'Detail the first major event that sets this timeline in motion.',
        });
      }
      return { events };
    }
    case ArtifactType.Task:
      return { state: TASK_STATE.Todo };
    default:
      return undefined;
  }
};

const createMockArtifactFromBlueprint = (blueprint: TemplateArtifactBlueprint): Artifact => ({
  id: 'temp-artifact',
  ownerId: 'temp-user',
  projectId: 'temp-project',
  type: blueprint.type,
  title: blueprint.title,
  summary: blueprint.summary,
  status: blueprint.status ?? 'idea',
  tags: blueprint.tags ?? [],
  relations: [],
  data: buildArtifactDataSkeleton(blueprint, blueprint.summary) ?? (Array.isArray(blueprint.data) ? blueprint.data : {}),
});

/**
 * Implements the "Lore Weaver" Atlas Intelligence guide.
 * Expands on a given summary for an artifact.
 */
export const expandSummary = async (artifact: Artifact): Promise<string> => {
    const prompt = `
        You are Lore Weaver, an AI assistant for creative world-builders.
        Your task is to expand upon a brief idea or summary for a creative artifact, adding evocative details, potential hooks, and interesting flavor.

        Artifact Type: ${artifact.type}
        Artifact Title: ${artifact.title}
        Current Summary: ${JSON.stringify(artifact.summary)}

        Expand this summary into a more detailed and inspiring paragraph. Build upon the existing idea without contradicting it.
        The new summary should be about 3-4 sentences long.
    `;

    try {
        const result = await requestGeminiText({
            prompt,
            config: {
                temperature: 0.7,
            },
        });

        return result.trim();
    } catch (error) {
        console.error('Error expanding summary with Gemini:', error);
        const message = getGeminiErrorMessage(error, 'Failed to expand summary.');
        throw new Error(message);
    }
};

const enhanceGeneratedArtifacts = async (
  artifacts: TemplateArtifactBlueprint[],
): Promise<TemplateArtifactBlueprint[]> => {
  const enhanced: TemplateArtifactBlueprint[] = [];

  for (const blueprint of artifacts) {
    const baseStatus = blueprint.status?.trim() ?? 'idea';
    const baseTags = blueprint.tags ? Array.from(new Set(blueprint.tags)) : [];

    let expandedSummary = blueprint.summary;
    try {
      const result = await expandSummary(createMockArtifactFromBlueprint(blueprint));
      if (typeof result === 'string' && result.trim().length > 0) {
        expandedSummary = result.trim();
      }
    } catch (error) {
      console.warn('Failed to expand generated artifact summary:', error);
    }

    const skeletonData = buildArtifactDataSkeleton(blueprint, expandedSummary);

    const enriched: TemplateArtifactBlueprint = {
      ...blueprint,
      summary: expandedSummary,
      status: baseStatus,
      tags: baseTags,
    };

    if (skeletonData !== undefined) {
      enriched.data = skeletonData;
    }

    enhanced.push(enriched);
  }

  return enhanced;
};

interface GenerateReleaseNotesParams {
    projectTitle: string;
    tone: string;
    audience: string;
    highlights: string;
    additionalNotes?: string;
}

export const generateReleaseNotes = async ({
    projectTitle,
    tone,
    audience,
    highlights,
    additionalNotes,
}: GenerateReleaseNotesParams): Promise<string> => {
    const prompt = `
        You are Release Bard, an AI assistant who rewrites changelog bullet points into narrative release notes.
        Project: ${projectTitle}
        Tone requested: ${tone}
        Primary audience: ${audience}

        Highlights provided (Markdown list):
        ${highlights}

        ${additionalNotes ? `Calls to action or extra context: ${additionalNotes}` : ''}

        Please craft 3-5 short paragraphs. Open with an inviting summary, weave the highlights into a cohesive story, and end with a friendly call-to-action tailored to the audience. Keep the language energetic but grounded, and respect the requested tone.
    `;

    try {
        const result = await requestGeminiText({
            prompt,
            config: {
                temperature: 0.75,
            },
        });

        return result.trim();
    } catch (error) {
        console.error('Error generating release notes with Gemini:', error);
        const message = getGeminiErrorMessage(error, 'Failed to generate release notes.');
        throw new Error(message);
    }
};

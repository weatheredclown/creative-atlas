
import { GoogleGenAI, Type } from '@google/genai';
import type { Artifact, ConlangLexeme, TemplateArtifactBlueprint } from '../types';
import { ArtifactType } from '../types';

const apiKey = import.meta.env.VITE_API_KEY;

let cachedClient: GoogleGenAI | null = null;

const getClient = (): GoogleGenAI => {
  if (!apiKey) {
    throw new Error('VITE_API_KEY environment variable not set');
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey });
  }

  return cachedClient;
};

const lexemeSchema = {
  type: Type.OBJECT,
  properties: {
    lemma: {
      type: Type.STRING,
      description: 'The base form of the word in the constructed language.'
    },
    pos: {
      type: Type.STRING,
      description: 'The part of speech (e.g., \'noun\', \'verb\', \'adjective\').'
    },
    gloss: {
      type: Type.STRING,
      description: 'A brief English definition or translation of the word.'
    },
    etymology: {
      type: Type.STRING,
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
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'Artifact title. Should highlight a unique element such as a character, location, or lore entry.',
    },
    type: {
      type: Type.STRING,
      description:
        `Artifact type. Choose from: ${GENERATED_ARTIFACT_TYPES.map((value) => `'${value}'`).join(', ')}.`,
    },
    summary: {
      type: Type.STRING,
      description: '1-3 sentence pitch that captures the hook and role of this artifact.',
    },
    status: {
      type: Type.STRING,
      description: "Optional status label such as 'idea', 'draft', or 'active'.",
    },
    tags: {
      type: Type.ARRAY,
      description: 'Optional short tags (1-2 words) describing themes or functions.',
      items: {
        type: Type.STRING,
        description: 'Single descriptive tag.',
      },
    },
  },
  required: ['title', 'type', 'summary'],
};

const projectBlueprintSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description:
        'A concise, compelling project title. Prefer proper nouns and limit to 60 characters.',
    },
    summary: {
      type: Type.STRING,
      description:
        'A short project summary (2-3 sentences) highlighting the premise, tone, or core goal.',
    },
    tags: {
      type: Type.ARRAY,
      description: '1-6 short descriptive tags that help classify the project.',
      items: {
        type: Type.STRING,
        description: 'A single descriptive tag (one or two words).',
      },
    },
    artifacts: {
      type: Type.ARRAY,
      description:
        '3-6 starter artifacts that would give the creator a head start. Focus on key characters, factions, locations, plot arcs, or lore documents.',
      items: projectArtifactSchema,
    },
  },
  required: ['title', 'summary'],
};

/**
 * Implements the "Conlang Smith" AI Copilot.
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
    const response = await getClient().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: [{ text: prompt }],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: lexemeSchema,
        },
        temperature: 0.8,
      },
    });

    const jsonText = response.text.trim();
    const generatedItems = JSON.parse(jsonText) as Omit<ConlangLexeme, 'id'>[];
    
    if (!Array.isArray(generatedItems)) {
        throw new Error('AI response is not a valid array.');
    }

    return generatedItems;

  } catch (error) {
    console.error('Error generating lexemes with Gemini:', error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate lexemes. The AI model may be unavailable or the request was invalid. Details: ${error.message}`);
    }
    throw new Error('An unknown error occurred while generating lexemes.');
  }
};

/**
 * Implements the "Lore Weaver" AI Copilot.
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
    const response = await getClient().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: [{ text: prompt }],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: projectBlueprintSchema,
        temperature: 0.6,
      },
    });

    const jsonText = response.text?.trim();
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

    return {
      title,
      summary,
      tags,
      artifacts,
    };
  } catch (error) {
    console.error('Error generating project blueprint with Gemini:', error);
    if (error instanceof Error) {
      throw new Error(
        `Failed to generate project details. The AI model may be unavailable or the request was invalid. Details: ${error.message}`,
      );
    }
    throw new Error('An unknown error occurred while generating project details.');
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

/**
 * Implements the "Lore Weaver" AI Copilot.
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
        const response = await getClient().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                role: 'user',
                parts: [{ text: prompt }],
            },
            config: {
                temperature: 0.7,
            }
        });

        return response.text.trim();
    } catch (error) {
        console.error('Error expanding summary with Gemini:', error);
        if (error instanceof Error) {
            throw new Error(`Failed to expand summary. The AI model may be unavailable or the request was invalid. Details: ${error.message}`);
        }
        throw new Error('An unknown error occurred while expanding the summary.');
    }
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
        const response = await getClient().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                role: 'user',
                parts: [{ text: prompt }],
            },
            config: {
                temperature: 0.75,
            },
        });

        return response.text.trim();
    } catch (error) {
        console.error('Error generating release notes with Gemini:', error);
        if (error instanceof Error) {
            throw new Error(`Failed to generate release notes. ${error.message}`);
        }
        throw new Error('An unknown error occurred while generating release notes.');
    }
};

const SUMMARY_LIMIT = 600;
const MAX_TAGS = 8;

export const NANO_BANANA_ART_MODE_VALUES = ['aurora', 'sunrise', 'prismatic'] as const;

export type NanoBananaArtMode = (typeof NANO_BANANA_ART_MODE_VALUES)[number];

const MODE_DESCRIPTORS: Record<NanoBananaArtMode, { label: string; palette: string; texture: string }> = {
  aurora: {
    label: 'Aurora Drift',
    palette: 'cool cosmic gradients, luminous auroras, distant nebula silhouettes',
    texture: 'flowing energy ribbons, soft atmospheric light, subtle starfields',
  },
  sunrise: {
    label: 'Sunrise Bloom',
    palette: 'warm sunbursts, peach and amber glows, lush botanicals',
    texture: 'layered petals, dust motes, soft painterly washes',
  },
  prismatic: {
    label: 'Prismatic Pulse',
    palette: 'neon prisms, saturated violets, cyan laser grids',
    texture: 'crystalline facets, geometric flares, high-contrast glows',
  },
};

const cleanText = (value: string | undefined | null): string => {
  if (!value) {
    return '';
  }
  return value.replace(/\s+/g, ' ').trim();
};

const truncate = (value: string, limit: number): string => {
  if (value.length <= limit) {
    return value;
  }
  return `${value.slice(0, limit - 1).trimEnd()}…`;
};

const normalizeTags = (tags: readonly string[] | undefined, limit: number): string[] => {
  if (!Array.isArray(tags) || tags.length === 0) {
    return [];
  }

  const result: string[] = [];
  const seen = new Set<string>();

  for (const tag of tags) {
    const cleaned = cleanText(tag);
    if (!cleaned) {
      continue;
    }
    const key = cleaned.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(cleaned);
    if (result.length >= limit) {
      break;
    }
  }

  return result;
};

export interface NanoBananaPromptInput {
  title: string;
  summary?: string;
  tags?: readonly string[];
  mode?: NanoBananaArtMode;
}

export const buildNanoBananaPrompt = ({
  title,
  summary,
  tags,
  mode = 'aurora',
}: NanoBananaPromptInput): string => {
  const cleanedTitle = cleanText(title) || 'Untitled Creative Atlas project';
  const cleanedSummary = cleanText(summary);
  const summarySegment = cleanedSummary ? truncate(cleanedSummary, SUMMARY_LIMIT) : null;
  const normalizedTags = normalizeTags(tags, MAX_TAGS);
  const tagSegment =
    normalizedTags.length > 0
      ? `Theme tags: ${normalizedTags.join(', ')}.`
      : null;

  const descriptor = MODE_DESCRIPTORS[mode] ?? MODE_DESCRIPTORS.aurora;
  const lines: string[] = [
    'You are Creative Atlas\'s Nano Banana art renderer.',
    'Generate a single 1200x630 cinematic digital painting without text overlays.',
    `Project title: ${cleanedTitle}.`,
  ];

  if (summarySegment) {
    lines.push(`Project overview: ${summarySegment}`);
  }

  if (tagSegment) {
    lines.push(tagSegment);
  }

  lines.push(
    `Visual goals: ${descriptor.label} mode emphasizes ${descriptor.palette} with ${descriptor.texture}.`,
  );
  lines.push(
    'Blend symbolism from the overview and tags, spotlight key motifs, and keep the composition bold and legible.',
  );

  return lines.join('\n');
};

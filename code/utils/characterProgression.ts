import {
  Artifact,
  ArtifactType,
  ArcStageId,
  CharacterData,
  CharacterProgressionState,
  CharacterProgressionStatus,
  isNarrativeArtifactType,
} from '../types';

export interface ArcStageConfig {
  id: ArcStageId;
  label: string;
  minScore: number;
  description: string;
  recommendation: string;
}

export interface CharacterArcEvaluation {
  stage: ArcStageConfig;
  nextStage: ArcStageConfig | null;
  progressRatio: number;
  progressPercent: number;
  traitCount: number;
  bioWordCount: number;
  summaryWordCount: number;
  narrativeLinks: Artifact[];
  timelineLinks: Artifact[];
  questLinks: Artifact[];
  suggestions: string[];
  score: number;
  progression: CharacterProgressionState;
}

export const ARC_STAGE_CONFIG: ArcStageConfig[] = [
  {
    id: 'spark',
    label: 'Spark',
    minScore: 0,
    description: 'A character concept takes shape. Their voice exists, but the first crucible is waiting.',
    recommendation: 'Capture an inciting beat or relationship hook to ignite their journey.',
  },
  {
    id: 'rising',
    label: 'Rising Stakes',
    minScore: 3.5,
    description: 'The cast member is threaded through early beats. Stakes and contradictions surface.',
    recommendation: 'Layer new complications or alliances that test their primary drive.',
  },
  {
    id: 'crisis',
    label: 'Crisis Point',
    minScore: 7,
    description: 'They collide with the arc’s core dilemma. Turning points demand irreversible choices.',
    recommendation: 'Outline a failure or sacrifice beat that redefines their trajectory.',
  },
  {
    id: 'transformation',
    label: 'Transformation',
    minScore: 10.5,
    description: 'The character evolves in response to conflict. Relationships and abilities shift visibly.',
    recommendation: 'Document the aftermath—new abilities, scars, or alliances born from the crisis.',
  },
  {
    id: 'legacy',
    label: 'Legacy Echo',
    minScore: 14,
    description: 'Their choices ripple outward. Continuity, memory, and world systems adjust around them.',
    recommendation: 'Author canon notes or exports so future modules respect their impact.',
  },
];

const ARC_STAGE_ORDER = ARC_STAGE_CONFIG.map((config) => config.id);

export const ARC_STAGE_BADGE_BASE_CLASSES =
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide';

export const ARC_STAGE_BADGE_COLOR_CLASSES: Record<ArcStageId, string> = {
  spark: 'border-cyan-400/50 bg-cyan-500/10 text-cyan-200',
  rising: 'border-violet-400/50 bg-violet-500/10 text-violet-200',
  crisis: 'border-amber-400/50 bg-amber-500/10 text-amber-200',
  transformation: 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200',
  legacy: 'border-pink-400/50 bg-pink-500/10 text-pink-200',
};

export const getArcStageBadgeClassName = (stageId: ArcStageId): string => {
  return `${ARC_STAGE_BADGE_BASE_CLASSES} ${ARC_STAGE_BADGE_COLOR_CLASSES[stageId]}`;
};

const ARC_STAGE_STATUS_MAP: Record<ArcStageId, CharacterProgressionStatus> = {
  spark: 'inciting',
  rising: 'escalating',
  crisis: 'confrontation',
  transformation: 'resolution',
  legacy: 'legacy',
};

export const formatProgressionStatus = (status: CharacterProgressionStatus): string => {
  switch (status) {
    case 'inciting':
      return 'Inciting Spark';
    case 'escalating':
      return 'Escalating Stakes';
    case 'confrontation':
      return 'Confrontation';
    case 'resolution':
      return 'Resolution Arc';
    case 'legacy':
      return 'Legacy Echo';
    default:
      return 'Untracked';
  }
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const safeWordCount = (text?: string | null) => {
  if (!text) {
    return 0;
  }
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
};

const selectStageForScore = (score: number): ArcStageConfig => {
  for (let index = ARC_STAGE_CONFIG.length - 1; index >= 0; index -= 1) {
    const config = ARC_STAGE_CONFIG[index];
    if (score >= config.minScore) {
      return config;
    }
  }
  return ARC_STAGE_CONFIG[0];
};

const getNextStage = (currentStage: ArcStageConfig): ArcStageConfig | null => {
  const currentIndex = ARC_STAGE_ORDER.indexOf(currentStage.id);
  if (currentIndex < 0 || currentIndex >= ARC_STAGE_CONFIG.length - 1) {
    return null;
  }
  return ARC_STAGE_CONFIG[currentIndex + 1];
};

const buildProgressionState = (
  character: Artifact,
  stage: ArcStageConfig,
): CharacterProgressionState => {
  const data = (character.data as CharacterData | undefined) ?? { bio: '', traits: [] };
  const previousState = data.progression;
  const status = ARC_STAGE_STATUS_MAP[stage.id];
  const now = new Date().toISOString();

  if (!previousState) {
    return {
      stageId: stage.id,
      status,
      updatedAt: now,
      lastAdvancedAt: now,
      checkpoints: [
        {
          stageId: stage.id,
          status,
          notedAt: now,
          summary: 'Initial progression snapshot derived from arc evaluation.',
        },
      ],
    } satisfies CharacterProgressionState;
  }

  if (previousState.stageId === stage.id && previousState.status === status) {
    return {
      ...previousState,
      updatedAt: previousState.updatedAt ?? now,
      stageId: stage.id,
      status,
    } satisfies CharacterProgressionState;
  }

  return {
    stageId: stage.id,
    status,
    updatedAt: now,
    lastAdvancedAt: now,
    checkpoints: [
      ...previousState.checkpoints,
      {
        stageId: stage.id,
        status,
        notedAt: now,
        summary: `Advanced to ${stage.label} via arc evaluation.`,
      },
    ],
  } satisfies CharacterProgressionState;
};

const deriveStatusScore = (status: string | undefined) => {
  if (!status) {
    return 0.5;
  }
  const normalized = status.toLowerCase();
  if (normalized.includes('final') || normalized.includes('complete') || normalized.includes('publish')) {
    return 3.5;
  }
  if (normalized.includes('revise') || normalized.includes('edit') || normalized.includes('polish')) {
    return 2.75;
  }
  if (normalized.includes('progress') || normalized.includes('draft')) {
    return 2;
  }
  if (normalized.includes('idea') || normalized.includes('concept')) {
    return 1;
  }
  return 1.25;
};

const buildSuggestions = (params: {
  stage: ArcStageConfig;
  traitCount: number;
  bioWordCount: number;
  summaryWordCount: number;
  narrativeLinks: Artifact[];
  timelineLinks: Artifact[];
}): string[] => {
  const suggestions = new Set<string>();
  suggestions.add(params.stage.recommendation);

  if (params.narrativeLinks.length < 2) {
    suggestions.add('Link them to additional scenes or chapters to showcase escalation.');
  }

  if (params.timelineLinks.length === 0) {
    suggestions.add('Anchor at least one timeline beat so continuity can track the change.');
  }

  if (params.traitCount < 3) {
    suggestions.add('Document three or more defining traits so their evolution is explicit.');
  }

  if (params.bioWordCount < 120) {
    suggestions.add('Expand the biography with emotional stakes or formative scars.');
  }

  if (params.summaryWordCount < 40) {
    suggestions.add('Refresh the summary with the current objective or internal conflict.');
  }

  return Array.from(suggestions).slice(0, 3);
};

export const evaluateCharacterArc = (
  character: Artifact,
  lookup: Map<string, Artifact>,
): CharacterArcEvaluation => {
  const data = (character.data as CharacterData | undefined) ?? { bio: '', traits: [] };
  const traits = Array.isArray(data.traits) ? data.traits : [];
  const traitCount = traits.length;
  const bioWordCount = safeWordCount(data.bio);
  const summaryWordCount = safeWordCount(character.summary);

  const relatedArtifacts = character.relations
    .map((relation) => lookup.get(relation.toId))
    .filter((related): related is Artifact => Boolean(related));

  const narrativeLinks = relatedArtifacts.filter(
    (related) =>
      isNarrativeArtifactType(related.type) ||
      related.type === ArtifactType.Scene ||
      related.type === ArtifactType.Chapter,
  );

  const timelineLinks = relatedArtifacts.filter((related) => related.type === ArtifactType.Timeline);

  const questLinks = relatedArtifacts.filter(
    (related) => related.type === ArtifactType.Task || related.type === ArtifactType.GameModule,
  );

  const statusScore = deriveStatusScore(character.status);
  const traitScore = traitCount * 1.25;
  const bioScore = Math.min(3, bioWordCount / 80);
  const summaryScore = Math.min(2, summaryWordCount / 60);
  const narrativeScore = narrativeLinks.length * 1.8;
  const timelineScore = timelineLinks.length * 1.5;
  const questScore = questLinks.length * 0.75;

  const score = Number(
    (
      statusScore +
      traitScore +
      bioScore +
      summaryScore +
      narrativeScore +
      timelineScore +
      questScore
    ).toFixed(2),
  );

  const stage = selectStageForScore(score);
  const nextStage = getNextStage(stage);
  const nextThreshold = nextStage ? nextStage.minScore : stage.minScore + 4;
  const progressRatio = nextStage
    ? clamp((score - stage.minScore) / (nextThreshold - stage.minScore || 1), 0, 1)
    : 1;
  const progressPercent = Math.round(progressRatio * 100);

  const suggestions = buildSuggestions({
    stage,
    traitCount,
    bioWordCount,
    summaryWordCount,
    narrativeLinks,
    timelineLinks,
  });

  const progression = buildProgressionState(character, stage);

  return {
    stage,
    nextStage,
    progressRatio,
    progressPercent,
    traitCount,
    bioWordCount,
    summaryWordCount,
    narrativeLinks,
    timelineLinks,
    questLinks,
    suggestions,
    score,
    progression,
  } satisfies CharacterArcEvaluation;
};


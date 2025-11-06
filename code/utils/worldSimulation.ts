import {
  Artifact,
  ArtifactType,
  LocationData,
  MagicSystemData,
  TimelineData,
  TimelineEvent,
} from '../types';

export type ConstraintType = 'physics' | 'metaphysics';
export type ConstraintStatus = 'stable' | 'volatile' | 'forbidden' | 'unknown';

export interface ConstraintAnnotation {
  id: string;
  label: string;
  type: ConstraintType;
  status: ConstraintStatus;
  summary: string;
  detail?: string;
  relatedArtifactIds: string[];
}

export interface WorldAgeSegment {
  label: string;
  start: number;
  end: number | null;
  eventCount: number;
  signature: string;
  relatedEventTitles: string[];
}

export interface WorldAgeProgression {
  currentAge: WorldAgeSegment | null;
  upcomingAge: WorldAgeSegment | null;
  eras: WorldAgeSegment[];
  lastRecordedYear: number | null;
}

export type FactionStability = 'stable' | 'shifting' | 'volatile';

export interface FactionConflictSummary {
  id: string;
  factionName: string;
  summary: string;
  alliances: string[];
  rivalries: string[];
  tensions: string[];
  stability: FactionStability;
  relatedArtifactId: string;
}

export interface WorldSimulationSnapshot {
  constraints: ConstraintAnnotation[];
  ageProgression: WorldAgeProgression;
  factions: FactionConflictSummary[];
}

interface TimelineEventWithMeta extends TimelineEvent {
  artifactId: string;
  year: number | null;
}

const STATUS_RANK: Record<ConstraintStatus, number> = {
  forbidden: 0,
  volatile: 1,
  stable: 2,
  unknown: 3,
};

const ERA_LABELS = ['Founding Age', 'Expansion Era', 'Flux Cycle', 'Apex Horizon'];

const ALLIANCE_KINDS = new Set(['ALLY_OF', 'SUPPORTS', 'TRADE_PARTNER', 'PROTECTS']);
const RIVAL_KINDS = new Set(['ENEMY_OF', 'AT_WAR_WITH', 'OPPOSED_TO', 'RIVAL']);
const TENSION_KINDS = new Set(['INFLUENCES', 'PRESSURES', 'TENSIONS_WITH', 'COMPETING_FOR']);

const VOLATILE_KEYWORDS = /(volatile|unstable|danger|backlash|cataclysm|fracture|feral|sacrifice|shatter|scar|threat)/i;
const FORBIDDEN_KEYWORDS = /(forbidden|taboo|never|prohibited|ban|do not)/i;
const METAPHYSICS_KEYWORDS = /(magic|thread|ritual|soul|veil|ley|spirit|arcane|astral|mana|curse)/i;
const PHYSICS_KEYWORDS = /(gravity|storm|pressure|radiation|tectonic|clockwork|gear|machine|technology|desert|flood|climate|storm)/i;

const sanitizeText = (value: string | undefined | null): string => value?.trim() ?? '';

const detectStatusFromText = (text: string, fallback: ConstraintStatus): ConstraintStatus => {
  if (FORBIDDEN_KEYWORDS.test(text)) {
    return 'forbidden';
  }
  if (VOLATILE_KEYWORDS.test(text)) {
    return 'volatile';
  }
  return fallback;
};

const detectConstraintType = (text: string, explicitType?: ConstraintType): ConstraintType => {
  if (explicitType) {
    return explicitType;
  }
  if (METAPHYSICS_KEYWORDS.test(text) && !PHYSICS_KEYWORDS.test(text)) {
    return 'metaphysics';
  }
  if (PHYSICS_KEYWORDS.test(text)) {
    return 'physics';
  }
  return 'metaphysics';
};

const parseChronoValue = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const direct = Number.parseFloat(trimmed);
  if (!Number.isNaN(direct)) {
    return direct;
  }

  const iso = Date.parse(trimmed);
  if (!Number.isNaN(iso)) {
    return new Date(iso).getFullYear();
  }

  const match = trimmed.match(/-?\d{1,4}/);
  if (match) {
    const parsed = Number.parseInt(match[0] ?? '', 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return null;
};

const buildMagicSystemConstraints = (
  artifact: Artifact,
  data: MagicSystemData,
): ConstraintAnnotation[] => {
  const annotations: ConstraintAnnotation[] = [];

  for (const principle of data.principles) {
    const focus = sanitizeText(principle.focus);
    const description = sanitizeText(principle.description);
    const combined = `${focus} ${description}`.trim();
    const status = principle.stability ?? 'stable';
    const inferredStatus = detectStatusFromText(combined, status);
    annotations.push({
      id: `${artifact.id}-principle-${principle.id}`,
      label: principle.title,
      type: 'metaphysics',
      status: inferredStatus,
      summary: focus || description || 'Document the governing principle.',
      detail: description && description !== focus ? description : undefined,
      relatedArtifactIds: [artifact.id],
    });
  }

  for (const source of data.sources) {
    const combined = `${source.resonance} ${source.capacity} ${source.tells}`;
    const status = detectStatusFromText(combined, 'stable');
    annotations.push({
      id: `${artifact.id}-source-${source.id}`,
      label: source.name,
      type: 'metaphysics',
      status,
      summary: sanitizeText(source.resonance) || 'Describe the resonance signature.',
      detail: sanitizeText(source.capacity) || undefined,
      relatedArtifactIds: [artifact.id],
    });
  }

  for (const ritual of data.rituals) {
    const combined = `${ritual.effect} ${ritual.failure}`;
    const status = detectStatusFromText(combined, 'stable');
    annotations.push({
      id: `${artifact.id}-ritual-${ritual.id}`,
      label: ritual.name,
      type: 'metaphysics',
      status,
      summary: sanitizeText(ritual.effect) || 'Document what the ritual achieves.',
      detail: sanitizeText(ritual.cost) || undefined,
      relatedArtifactIds: [artifact.id],
    });
  }

  for (const taboo of data.taboos) {
    const combined = `${taboo.rule} ${taboo.consequence}`;
    const status = detectStatusFromText(combined, 'forbidden');
    annotations.push({
      id: `${artifact.id}-taboo-${taboo.id}`,
      label: taboo.rule,
      type: 'metaphysics',
      status,
      summary: sanitizeText(taboo.consequence) || 'Note the backlash for breaking this taboo.',
      detail: sanitizeText(taboo.restoration) || undefined,
      relatedArtifactIds: [artifact.id],
    });
  }

  data.fieldNotes.forEach((note, index) => {
    const status = detectStatusFromText(note, 'stable');
    annotations.push({
      id: `${artifact.id}-note-${index}`,
      label: 'Field Note',
      type: 'metaphysics',
      status,
      summary: note,
      relatedArtifactIds: [artifact.id],
    });
  });

  return annotations;
};

const buildLocationConstraints = (artifact: Artifact, data: LocationData): ConstraintAnnotation[] => {
  const annotations: ConstraintAnnotation[] = [];
  const baseDescription = sanitizeText(data.description);
  if (baseDescription) {
    const status = detectStatusFromText(baseDescription, 'stable');
    annotations.push({
      id: `${artifact.id}-environment`,
      label: `${artifact.title} environment`,
      type: detectConstraintType(baseDescription, PHYSICS_KEYWORDS.test(baseDescription) ? 'physics' : undefined),
      status,
      summary: baseDescription,
      relatedArtifactIds: [artifact.id],
    });
  }

  data.features.forEach((feature) => {
    const description = sanitizeText(feature.description);
    const status = detectStatusFromText(description, 'stable');
    const type = detectConstraintType(`${feature.name} ${description}`, undefined);
    annotations.push({
      id: `${artifact.id}-feature-${feature.id}`,
      label: feature.name,
      type,
      status,
      summary: description || 'Describe how this feature alters local conditions.',
      relatedArtifactIds: [artifact.id],
    });
  });

  return annotations;
};

const buildTimelineConstraints = (
  artifact: Artifact,
  data: TimelineData,
): ConstraintAnnotation[] => {
  const annotations: ConstraintAnnotation[] = [];

  data.events.forEach((event) => {
    const combined = `${event.title} ${event.description}`;
    const status = detectStatusFromText(combined, 'stable');
    const type = detectConstraintType(combined, undefined);
    if (status === 'stable' && type === 'metaphysics') {
      // Skip benign notes to avoid noise.
      return;
    }

    annotations.push({
      id: `${artifact.id}-event-${event.id}`,
      label: event.title,
      type,
      status,
      summary: sanitizeText(event.description) || 'Timeline event affecting systemic constraints.',
      detail: sanitizeText(event.date),
      relatedArtifactIds: [artifact.id],
    });
  });

  return annotations;
};

const buildTimelineEvents = (artifact: Artifact, data: TimelineData): TimelineEventWithMeta[] =>
  data.events.map((event) => ({
    ...event,
    artifactId: artifact.id,
    year: parseChronoValue(event.date ?? ''),
  }));

const resolveEraLabel = (index: number): string => ERA_LABELS[index] ?? `Age ${index + 1}`;

const summarizeEvents = (events: TimelineEventWithMeta[]): string[] => {
  if (events.length === 0) {
    return [];
  }
  const highlights = events.slice(-2).map((event) => `${event.title}${event.date ? ` (${event.date})` : ''}`);
  return highlights;
};

const buildWorldAgeProgression = (events: TimelineEventWithMeta[]): WorldAgeProgression => {
  const datedEvents = events.filter((event) => event.year !== null).sort((a, b) => (a.year! - b.year!));
  if (datedEvents.length === 0) {
    return {
      currentAge: null,
      upcomingAge: null,
      eras: [],
      lastRecordedYear: null,
    };
  }

  const firstYear = datedEvents[0]!.year!;
  const lastYear = datedEvents[datedEvents.length - 1]!.year!;
  const span = Math.max(1, lastYear - firstYear);

  let bucketCount = 1;
  if (span > 0 && datedEvents.length >= 2) {
    bucketCount = 2;
  }
  if (span > 150 && datedEvents.length >= 3) {
    bucketCount = 3;
  }
  if (span > 400 && datedEvents.length >= 4) {
    bucketCount = 4;
  }

  const step = Math.max(1, Math.ceil(span / bucketCount));
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    start: firstYear + index * step,
    end: index === bucketCount - 1 ? lastYear : firstYear + (index + 1) * step - 1,
    events: [] as TimelineEventWithMeta[],
  }));

  datedEvents.forEach((event) => {
    const offset = event.year! - firstYear;
    const bucketIndex = Math.min(bucketCount - 1, span === 0 ? 0 : Math.floor(offset / step));
    buckets[bucketIndex]!.events.push(event);
  });

  const eras: WorldAgeSegment[] = buckets.map((bucket, index) => {
    const signatureEvent = bucket.events[bucket.events.length - 1];
    return {
      label: resolveEraLabel(index),
      start: bucket.start,
      end: bucket.end,
      eventCount: bucket.events.length,
      signature: signatureEvent
        ? `${signatureEvent.title}${signatureEvent.date ? ` (${signatureEvent.date})` : ''}`
        : 'Awaiting chronicle',
      relatedEventTitles: summarizeEvents(bucket.events),
    };
  });

  const currentIndex = buckets.reduce((latest, bucket, index) => (bucket.events.length > 0 ? index : latest), 0);
  const currentAge = eras[currentIndex] ?? null;
  const upcomingAge = eras[currentIndex + 1] ?? null;

  return {
    currentAge,
    upcomingAge,
    eras,
    lastRecordedYear: lastYear,
  };
};

const determineFactionStability = (artifact: Artifact, alliances: string[], rivalries: string[], tensions: string[]): FactionStability => {
  const tensionScore = rivalries.length * 2 + tensions.length;
  const allianceScore = alliances.length;
  const summary = `${artifact.summary} ${artifact.tags.join(' ')}`;
  if (VOLATILE_KEYWORDS.test(summary)) {
    return 'volatile';
  }
  if (tensionScore === 0) {
    return 'stable';
  }
  if (tensionScore > allianceScore + 1) {
    return 'volatile';
  }
  if (tensionScore > allianceScore) {
    return 'shifting';
  }
  return 'stable';
};

const buildFactionSummaries = (artifacts: Artifact[]): FactionConflictSummary[] => {
  const indexById = new Map<string, Artifact>(artifacts.map((artifact) => [artifact.id, artifact]));
  return artifacts
    .filter((artifact) => artifact.type === ArtifactType.Faction)
    .map((artifact) => {
      const alliances: string[] = [];
      const rivalries: string[] = [];
      const tensions: string[] = [];

      artifact.relations.forEach((relation) => {
        const targetTitle = indexById.get(relation.toId)?.title ?? relation.toId;
        if (ALLIANCE_KINDS.has(relation.kind)) {
          alliances.push(targetTitle);
        } else if (RIVAL_KINDS.has(relation.kind)) {
          rivalries.push(targetTitle);
        } else if (TENSION_KINDS.has(relation.kind)) {
          tensions.push(targetTitle);
        }
      });

      const stability = determineFactionStability(artifact, alliances, rivalries, tensions);
      const parts: string[] = [];
      if (alliances.length > 0) {
        parts.push(`Allies: ${alliances.join(', ')}`);
      }
      if (rivalries.length > 0) {
        parts.push(`Rivals: ${rivalries.join(', ')}`);
      }
      if (tensions.length > 0) {
        parts.push(`Tensions: ${tensions.join(', ')}`);
      }
      const summary = parts.join(' · ') || 'No recorded alliances or conflicts yet.';

      return {
        id: artifact.id,
        factionName: artifact.title,
        summary,
        alliances,
        rivalries,
        tensions,
        stability,
        relatedArtifactId: artifact.id,
      };
    })
    .sort((a, b) => {
      const stabilityRank: Record<FactionStability, number> = { stable: 2, shifting: 1, volatile: 0 };
      const rankDiff = stabilityRank[a.stability] - stabilityRank[b.stability];
      if (rankDiff !== 0) {
        return rankDiff;
      }
      return a.factionName.localeCompare(b.factionName);
    });
};

export const deriveWorldSimulationSnapshot = (artifacts: Artifact[]): WorldSimulationSnapshot => {
  const constraints: ConstraintAnnotation[] = [];
  let allTimelineEvents: TimelineEventWithMeta[] = [];

  for (const artifact of artifacts) {
    switch (artifact.type) {
      case ArtifactType.MagicSystem: {
        const data = artifact.data as MagicSystemData | undefined;
        if (data) {
          constraints.push(...buildMagicSystemConstraints(artifact, data));
        }
        break;
      }
      case ArtifactType.Location: {
        const data = artifact.data as LocationData | undefined;
        if (data) {
          constraints.push(...buildLocationConstraints(artifact, data));
        }
        break;
      }
      case ArtifactType.Timeline: {
        const data = artifact.data as TimelineData | undefined;
        if (data) {
          allTimelineEvents = allTimelineEvents.concat(buildTimelineEvents(artifact, data));
          constraints.push(...buildTimelineConstraints(artifact, data));
        }
        break;
      }
      case ArtifactType.Wiki: {
        const content = typeof artifact.data === 'object' && artifact.data && 'content' in artifact.data
          ? sanitizeText((artifact.data as { content?: string }).content)
          : '';
        if (content) {
          const status = detectStatusFromText(content, 'stable');
          if (status !== 'stable') {
            constraints.push({
              id: `${artifact.id}-wiki-constraint`,
              label: artifact.title,
              type: detectConstraintType(content, undefined),
              status,
              summary: content.slice(0, 160),
              relatedArtifactIds: [artifact.id],
            });
          }
        }
        break;
      }
      default:
        break;
    }
  }

  constraints.sort((a, b) => {
    const statusDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (statusDiff !== 0) {
      return statusDiff;
    }
    if (a.type !== b.type) {
      return a.type.localeCompare(b.type);
    }
    return a.label.localeCompare(b.label);
  });

  const ageProgression = buildWorldAgeProgression(allTimelineEvents);
  const factions = buildFactionSummaries(artifacts);

  return {
    constraints,
    ageProgression,
    factions,
  };
};

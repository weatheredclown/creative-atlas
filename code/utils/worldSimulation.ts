import {
  Artifact,
  ArtifactType,
  LocationData,
  MagicSystemData,
  MagicSystemPrinciple,
  MagicSystemTaboo,
  TimelineData,
  TimelineEvent,
} from '../types';

export interface WorldAgeSummary {
  timelineCount: number;
  totalEvents: number;
  earliestYear: number | null;
  latestYear: number | null;
  spanYears: number | null;
  densestTimeline?: {
    id: string;
    title: string;
    projectId: string;
    eventCount: number;
  };
  eraBuckets: Array<{ label: string; count: number }>;
}

export interface MagicConstraintSummary {
  codexCount: number;
  annotatedCodexCount: number;
  volatilePrinciples: Array<{
    codexId: string;
    codexTitle: string;
    principle: MagicSystemPrinciple;
  }>;
  forbiddenPrinciples: Array<{
    codexId: string;
    codexTitle: string;
    principle: MagicSystemPrinciple;
  }>;
  taboos: Array<{
    codexId: string;
    codexTitle: string;
    taboo: MagicSystemTaboo;
  }>;
}

export interface FactionNetworkSummary {
  factionCount: number;
  factionsWithLinks: number;
  crossFactionLinks: number;
  densestFaction?: {
    id: string;
    title: string;
    projectId: string;
    tieCount: number;
    factionConflicts: number;
    notableLinks: string[];
  };
  factionEntries: Array<{
    id: string;
    title: string;
    tieCount: number;
    factionConflicts: number;
    notableLinks: string[];
  }>;
}

export interface NpcMemoryEntry {
  id: string;
  title: string;
  type: ArtifactType.Character | ArtifactType.Faction;
  projectId: string;
  relationCount: number;
  crossWorldCount: number;
  linkedArtifacts: string[];
}

export interface NpcMemorySummary {
  entries: NpcMemoryEntry[];
  anchoredCount: number;
  crossWorldActors: number;
  totalNpcCount: number;
}

export interface WorldSimulationAnalysis {
  worldAge: WorldAgeSummary;
  magicConstraints: MagicConstraintSummary;
  factionNetwork: FactionNetworkSummary;
  npcMemory: NpcMemorySummary;
  hasData: boolean;
}

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

const isTimelineEventArray = (events: unknown): events is TimelineEvent[] =>
  Array.isArray(events) && events.every((event) => event && typeof event === 'object' && 'id' in event);

const toTimelineData = (artifact: Artifact): TimelineData | null => {
  if (artifact.type !== ArtifactType.Timeline) {
    return null;
  }
  const data = artifact.data as TimelineData | undefined;
  if (!data || !isTimelineEventArray(data.events)) {
    return null;
  }
  return data;
};

const toMagicSystemData = (artifact: Artifact): MagicSystemData | null => {
  if (artifact.type !== ArtifactType.MagicSystem) {
    return null;
  }
  const data = artifact.data as MagicSystemData | undefined;
  if (!data || typeof data !== 'object') {
    return null;
  }
  return data;
};

const parseYear = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const match = trimmed.match(/^-?\d+/);
  if (!match) {
    return null;
  }
  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const ordinalSuffix = (value: number): string => {
  const remainder = value % 100;
  if (remainder >= 11 && remainder <= 13) {
    return `${value}th`;
  }
  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
};

const getCenturyLabel = (year: number): string => {
  const absolute = Math.abs(year);
  const centuryIndex = absolute === 0 ? 1 : Math.floor((absolute - 1) / 100) + 1;
  const suffix = ordinalSuffix(centuryIndex);
  return `${suffix} ${year < 0 ? 'BCE' : 'CE'}`;
};

const formatYear = (year: number | null): string => {
  if (year === null) {
    return 'Unspecified';
  }
  if (year < 0) {
    return `${Math.abs(year)} BCE`;
  }
  if (year === 0) {
    return 'Year 0';
  }
  return `${year} CE`;
};

export const summarizeWorldAge = (artifacts: Artifact[]): WorldAgeSummary => {
  const timelines = artifacts.filter((artifact) => artifact.type === ArtifactType.Timeline);
  const eraCounts = new Map<string, number>();
  const timelineEventCounts = new Map<string, { count: number; artifact: Artifact }>();
  const numericYears: number[] = [];

  for (const timeline of timelines) {
    const data = toTimelineData(timeline);
    if (!data) {
      continue;
    }

    const count = data.events.length;
    if (count > 0) {
      timelineEventCounts.set(timeline.id, { count, artifact: timeline });
    }

    for (const event of data.events) {
      const year = parseYear(event.date);
      if (year !== null) {
        numericYears.push(year);
        const centuryLabel = getCenturyLabel(year);
        eraCounts.set(centuryLabel, (eraCounts.get(centuryLabel) ?? 0) + 1);
      } else {
        eraCounts.set('Uncharted Era', (eraCounts.get('Uncharted Era') ?? 0) + 1);
      }
    }
  }

  const earliestYear = numericYears.length > 0 ? Math.min(...numericYears) : null;
  const latestYear = numericYears.length > 0 ? Math.max(...numericYears) : null;
  const spanYears = earliestYear !== null && latestYear !== null ? latestYear - earliestYear : null;

  let densestTimeline: WorldAgeSummary['densestTimeline'];
  if (timelineEventCounts.size > 0) {
    const sorted = [...timelineEventCounts.values()].sort((a, b) => b.count - a.count);
    const top = sorted[0];
    densestTimeline = {
      id: top.artifact.id,
      title: top.artifact.title,
      projectId: top.artifact.projectId,
      eventCount: top.count,
    };
  }

  const eraBuckets = [...eraCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  return {
    timelineCount: timelines.length,
    totalEvents: numericYears.length,
    earliestYear,
    latestYear,
    spanYears,
    densestTimeline,
    eraBuckets,
  };
};

export const summarizeMagicConstraints = (artifacts: Artifact[]): MagicConstraintSummary => {
  const magicSystems = artifacts
    .filter((artifact) => artifact.type === ArtifactType.MagicSystem)
    .map((artifact) => ({ artifact, data: toMagicSystemData(artifact) }))
    .filter((entry): entry is { artifact: Artifact; data: MagicSystemData } => Boolean(entry.data));

  const volatilePrinciples: MagicConstraintSummary['volatilePrinciples'] = [];
  const forbiddenPrinciples: MagicConstraintSummary['forbiddenPrinciples'] = [];
  const taboos: MagicConstraintSummary['taboos'] = [];

  let annotatedCodexCount = 0;

  for (const { artifact, data } of magicSystems) {
    const hasPrinciple = Array.isArray(data.principles) && data.principles.length > 0;
    const hasTaboo = Array.isArray(data.taboos) && data.taboos.length > 0;
    const hasFieldNotes = Array.isArray(data.fieldNotes) && data.fieldNotes.length > 0;

    if (hasPrinciple && (hasTaboo || hasFieldNotes)) {
      annotatedCodexCount += 1;
    }

    for (const principle of data.principles ?? []) {
      if (principle.stability === 'volatile') {
        volatilePrinciples.push({ codexId: artifact.id, codexTitle: artifact.title, principle });
      }
      if (principle.stability === 'forbidden') {
        forbiddenPrinciples.push({ codexId: artifact.id, codexTitle: artifact.title, principle });
      }
    }

    for (const taboo of data.taboos ?? []) {
      taboos.push({ codexId: artifact.id, codexTitle: artifact.title, taboo });
    }
  }

  return {
    codexCount: magicSystems.length,
    annotatedCodexCount,
    volatilePrinciples,
    forbiddenPrinciples,
    taboos,
  };
};

const buildArtifactLookup = (artifacts: Artifact[]): Map<string, Artifact> => {
  return new Map(artifacts.map((artifact) => [artifact.id, artifact]));
};

export const summarizeFactionNetwork = (
  projectArtifacts: Artifact[],
  allArtifacts: Artifact[] = projectArtifacts,
): FactionNetworkSummary => {
  const lookup = buildArtifactLookup(allArtifacts);
  const factions = projectArtifacts.filter((artifact) => artifact.type === ArtifactType.Faction);

  const factionEntries: FactionNetworkSummary['factionEntries'] = [];
  let factionsWithLinks = 0;
  let crossFactionLinks = 0;

  for (const faction of factions) {
    const linkedArtifacts = faction.relations
      .map((relation) => lookup.get(relation.toId))
      .filter((related): related is Artifact => Boolean(related));

    const tieCount = linkedArtifacts.length;
    const factionConflicts = linkedArtifacts.filter((related) => related.type === ArtifactType.Faction).length;

    if (tieCount > 0) {
      factionsWithLinks += 1;
    }
    crossFactionLinks += factionConflicts;

    const notableLinks = linkedArtifacts
      .slice(0, 3)
      .map((related) => `${related.title} (${related.type})`);

    factionEntries.push({
      id: faction.id,
      title: faction.title,
      tieCount,
      factionConflicts,
      notableLinks,
    });
  }

  const densestFaction = factionEntries
    .map((entry) => ({
      ...entry,
      projectId: lookup.get(entry.id)?.projectId ?? '',
    }))
    .sort((a, b) => b.tieCount - a.tieCount || b.factionConflicts - a.factionConflicts)
    .at(0);

  return {
    factionCount: factions.length,
    factionsWithLinks,
    crossFactionLinks,
    densestFaction,
    factionEntries: factionEntries.sort((a, b) => b.tieCount - a.tieCount || a.title.localeCompare(b.title)).slice(0, 4),
  };
};

export const summarizeNpcMemory = (
  projectArtifacts: Artifact[],
  allArtifacts: Artifact[] = projectArtifacts,
): NpcMemorySummary => {
  const lookup = buildArtifactLookup(allArtifacts);
  const npcs = projectArtifacts.filter((artifact) =>
    artifact.type === ArtifactType.Character || artifact.type === ArtifactType.Faction,
  );

  const entries: NpcMemoryEntry[] = npcs.map((npc) => {
    const linkedArtifacts = npc.relations
      .map((relation) => lookup.get(relation.toId))
      .filter((related): related is Artifact => Boolean(related));

    const relationCount = linkedArtifacts.length;
    const crossWorldIds = new Set(
      linkedArtifacts
        .map((related) => related.projectId)
        .filter((projectId) => projectId && projectId !== npc.projectId),
    );

    const linkedNames = linkedArtifacts.slice(0, 4).map((related) => `${related.title} (${related.type})`);

    return {
      id: npc.id,
      title: npc.title,
      type: npc.type as ArtifactType.Character | ArtifactType.Faction,
      projectId: npc.projectId,
      relationCount,
      crossWorldCount: crossWorldIds.size,
      linkedArtifacts: linkedNames,
    };
  });

  const sortedEntries = entries
    .filter((entry) => entry.relationCount > 0)
    .sort((a, b) => b.relationCount - a.relationCount || b.crossWorldCount - a.crossWorldCount || a.title.localeCompare(b.title))
    .slice(0, 6);

  const anchoredCount = entries.filter((entry) => entry.relationCount >= 2).length;
  const crossWorldActors = entries.filter((entry) => entry.crossWorldCount > 0).length;

  return {
    entries: sortedEntries,
    anchoredCount,
    crossWorldActors,
    totalNpcCount: npcs.length,
  };
};

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

  for (const principle of data.principles ?? []) {
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

  for (const source of data.sources ?? []) {
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

  for (const ritual of data.rituals ?? []) {
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

  for (const taboo of data.taboos ?? []) {
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

  (data.fieldNotes ?? []).forEach((note, index) => {
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

  for (const feature of data.features ?? []) {
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
  }

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
  return events.slice(-2).map((event) => `${event.title}${event.date ? ` (${event.date})` : ''}`);
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

const determineFactionStability = (
  artifact: Artifact,
  alliances: string[],
  rivalries: string[],
  tensions: string[],
): FactionStability => {
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
      const summaryText = parts.join(' · ') || 'No recorded alliances or conflicts yet.';

      return {
        id: artifact.id,
        factionName: artifact.title,
        summary: summaryText,
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

export const analyzeWorldSimulation = (
  projectArtifacts: Artifact[],
  allArtifacts: Artifact[] = projectArtifacts,
): WorldSimulationAnalysis => {
  const worldAge = summarizeWorldAge(projectArtifacts);
  const magicConstraints = summarizeMagicConstraints(projectArtifacts);
  const factionNetwork = summarizeFactionNetwork(projectArtifacts, allArtifacts);
  const npcMemory = summarizeNpcMemory(projectArtifacts, allArtifacts);

  const hasData =
    worldAge.timelineCount > 0 ||
    worldAge.totalEvents > 0 ||
    magicConstraints.codexCount > 0 ||
    factionNetwork.factionCount > 0 ||
    npcMemory.entries.length > 0;

  return {
    worldAge,
    magicConstraints,
    factionNetwork,
    npcMemory,
    hasData,
  };
};

export const formatWorldAgeRange = (summary: WorldAgeSummary): string => {
  if (summary.earliestYear === null && summary.latestYear === null) {
    return 'Awaiting first timeline entry';
  }
  if (summary.earliestYear !== null && summary.latestYear !== null) {
    if (summary.earliestYear === summary.latestYear) {
      return `Focused in ${formatYear(summary.earliestYear)}`;
    }
    return `${formatYear(summary.earliestYear)} → ${formatYear(summary.latestYear)}`;
  }
  return summary.earliestYear !== null
    ? `Begins ${formatYear(summary.earliestYear)}`
    : `Extends to ${formatYear(summary.latestYear)}`;
};

export const formatSpanYears = (summary: WorldAgeSummary): string => {
  if (summary.spanYears === null) {
    return '0 years logged';
  }
  if (summary.spanYears === 0) {
    return 'Same-year events';
  }
  const absolute = Math.abs(summary.spanYears);
  if (absolute >= 1000) {
    return `${(absolute / 1000).toFixed(1)}k years covered`;
  }
  return `${absolute} years covered`;
};

import {
  Artifact,
  ArtifactType,
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

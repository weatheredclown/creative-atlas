import {
  Artifact,
  ArtifactType,
  ContinuityWarning,
  NarrativeNeed,
  NarrativeNeedStatus,
  NARRATIVE_ARTIFACT_TYPES,
  Scene,
  SceneArtifactData,
  TimelineData,
} from '../types';

const narrativeSourceTypes = new Set<ArtifactType>([
  ...NARRATIVE_ARTIFACT_TYPES,
  ArtifactType.Scene,
  ArtifactType.Chapter,
]);

const SUPPORT_RELATION_KINDS = new Set<string>([
  'USES',
  'SET_IN',
  'DERIVES_FROM',
  'SPEAKS',
  'ALLY_OF',
  'ENEMY_OF',
  'FUELED_BY',
  'OWNS',
  'DEFINES',
]);

const CARDINALITY_RELATIONS = new Set<string>(['APPEARS_IN', 'ANCHORS', 'FEATURES']);

const getSummaryLength = (summary: string | undefined): number => {
  if (!summary) {
    return 0;
  }
  return summary.replace(/\s+/g, ' ').trim().length;
};

const determineStatus = (
  appearances: number,
  supportLinks: number,
  summaryLength: number,
  tagCount: number,
): NarrativeNeedStatus => {
  if (appearances >= 3 || (appearances >= 2 && supportLinks >= 2)) {
    return 'thriving';
  }
  if (appearances >= 2 || supportLinks >= 3) {
    return 'steady';
  }
  if (appearances === 1 || supportLinks >= 1 || summaryLength > 140 || tagCount >= 3) {
    return 'cooling';
  }
  return 'at-risk';
};

export const evaluateNarrativeNeeds = (artifacts: Artifact[]): NarrativeNeed[] => {
  const lookup = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
  const candidates = artifacts.filter((artifact) =>
    [ArtifactType.Character, ArtifactType.Faction, ArtifactType.Location].includes(artifact.type),
  );

  return candidates.map((artifact) => {
    const appearances = artifact.relations.reduce((count, relation) => {
      const target = lookup.get(relation.toId);
      if (!target) {
        return count;
      }
      if (narrativeSourceTypes.has(target.type) && CARDINALITY_RELATIONS.has(relation.kind)) {
        return count + 1;
      }
      return count;
    }, 0);

    const supportLinks = artifact.relations.reduce((count, relation) => {
      if (SUPPORT_RELATION_KINDS.has(relation.kind)) {
        return count + 1;
      }
      return count;
    }, 0);

    const narrativeNeed: NarrativeNeed = {
      artifactId: artifact.id,
      artifactTitle: artifact.title,
      artifactType: artifact.type,
      status: determineStatus(appearances, supportLinks, getSummaryLength(artifact.summary), artifact.tags.length),
      appearances,
      supportLinks,
      summaryLength: getSummaryLength(artifact.summary),
      tagCount: artifact.tags.length,
    };

    return narrativeNeed;
  });
};

const parseChronoValue = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseFloat(trimmed);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
};

const hasChronologyIssue = (timeline: TimelineData): boolean => {
  const chronoValues: number[] = [];
  for (const event of timeline.events) {
    const parsed = parseChronoValue(event.date);
    if (parsed === null) {
      continue;
    }
    chronoValues.push(parsed);
  }
  const sorted = [...chronoValues].sort((a, b) => a - b);
  return chronoValues.some((value, index) => value !== sorted[index]);
};

const hasDuplicateChrono = (timeline: TimelineData): boolean => {
  const seen = new Set<number>();
  for (const event of timeline.events) {
    const parsed = parseChronoValue(event.date);
    if (parsed === null) {
      continue;
    }
    if (seen.has(parsed)) {
      return true;
    }
    seen.add(parsed);
  }
  return false;
};

const isNarrativeArtifact = (artifact: Artifact): boolean =>
  narrativeSourceTypes.has(artifact.type);

const getSceneCount = (artifact: Artifact): number => {
  if (!isNarrativeArtifact(artifact)) {
    return 0;
  }
  if (artifact.type === ArtifactType.Scene) {
    const data = artifact.data as SceneArtifactData | undefined;
    if (!data) {
      return 0;
    }
    if (Array.isArray(data.dialogue) && data.dialogue.length > 0) {
      return 1;
    }
    return data.synopsis?.trim().length > 0 ? 1 : 0;
  }
  const data = artifact.data as Scene[] | undefined;
  if (!Array.isArray(data)) {
    return 0;
  }
  return data.length;
};

export const detectContinuityWarnings = (artifacts: Artifact[]): ContinuityWarning[] => {
  const lookup = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
  const warnings: ContinuityWarning[] = [];

  for (const artifact of artifacts) {
    if (artifact.type === ArtifactType.Character) {
      const appearances = artifact.relations.filter((relation) => {
        const target = lookup.get(relation.toId);
        return target ? narrativeSourceTypes.has(target.type) && relation.kind === 'APPEARS_IN' : false;
      }).length;
      if (appearances === 0) {
        warnings.push({
          id: `character-${artifact.id}-unused`,
          severity: 'alert',
          message: `${artifact.title} never appears in a scene or chapter.`,
          recommendation: 'Link the character to an active story beat or mark them as retired.',
          relatedArtifactIds: [artifact.id],
        });
      } else if (appearances === 1) {
        warnings.push({
          id: `character-${artifact.id}-low`,
          severity: 'caution',
          message: `${artifact.title} only appears once so far.`,
          recommendation: 'Plan a follow-up scene to keep their arc warm.',
          relatedArtifactIds: [artifact.id],
        });
      }
    }

    if (artifact.type === ArtifactType.Location) {
      const narrativeAnchors = artifact.relations.filter((relation) => {
        const target = lookup.get(relation.toId);
        if (!target) {
          return false;
        }
        return relation.kind === 'SET_IN' || (narrativeSourceTypes.has(target.type) && relation.kind === 'APPEARS_IN');
      }).length;
      if (narrativeAnchors === 0) {
        warnings.push({
          id: `location-${artifact.id}-unused`,
          severity: 'caution',
          message: `${artifact.title} is not anchored to any scenes.`,
          recommendation: 'Set a chapter or quest in this location or archive it until needed.',
          relatedArtifactIds: [artifact.id],
        });
      }
    }

    if (artifact.type === ArtifactType.MagicSystem || artifact.type === ArtifactType.Conlang) {
      const dependents = artifact.relations.filter((relation) => relation.kind === 'USES' || relation.kind === 'SPEAKS').length;
      if (dependents === 0) {
        warnings.push({
          id: `${artifact.type.toLowerCase()}-${artifact.id}-orphan`,
          severity: 'info',
          message: `${artifact.title} is defined but unused in current story beats.`,
          recommendation: 'Link a character, faction, or location that relies on this system.',
          relatedArtifactIds: [artifact.id],
        });
      }
    }

    if (isNarrativeArtifact(artifact)) {
      const sceneCount = getSceneCount(artifact);
      if (sceneCount === 0) {
        warnings.push({
          id: `narrative-${artifact.id}-empty`,
          severity: 'caution',
          message: `${artifact.title} has no scenes captured yet.`,
          recommendation: 'Outline at least three beats to keep the momentum flowing.',
          relatedArtifactIds: [artifact.id],
        });
      } else if (sceneCount < 3) {
        warnings.push({
          id: `narrative-${artifact.id}-thin`,
          severity: 'info',
          message: `${artifact.title} has only ${sceneCount} scene${sceneCount === 1 ? '' : 's'} recorded.`,
          recommendation: 'Consider adding midpoint or fallout beats to round out the sequence.',
          relatedArtifactIds: [artifact.id],
        });
      }
    }

    if (artifact.type === ArtifactType.Timeline) {
      const data = artifact.data as TimelineData | undefined;
      if (data) {
        if (hasChronologyIssue(data)) {
          warnings.push({
            id: `timeline-${artifact.id}-order`,
            severity: 'alert',
            message: `${artifact.title} has events out of chronological order.`,
            recommendation: 'Reorder events or adjust dates to match the intended flow of time.',
            relatedArtifactIds: [artifact.id],
          });
        }
        if (hasDuplicateChrono(data)) {
          warnings.push({
            id: `timeline-${artifact.id}-duplicate`,
            severity: 'caution',
            message: `${artifact.title} has multiple events sharing the same timestamp.`,
            recommendation: 'Clarify whether those beats are simultaneous or need distinct markers.',
            relatedArtifactIds: [artifact.id],
          });
        }
      }
    }
  }

  const factionArtifacts = artifacts.filter((artifact) => artifact.type === ArtifactType.Faction);
  for (const faction of factionArtifacts) {
    const allianceLinks = faction.relations.filter((relation) => relation.kind === 'ALLY_OF' || relation.kind === 'ENEMY_OF');
    if (allianceLinks.length === 0) {
      warnings.push({
        id: `faction-${faction.id}-static`,
        severity: 'info',
        message: `${faction.title} has no recorded conflicts or alliances.`,
        recommendation: 'Link opposing factions or note their current tensions to track political stakes.',
        relatedArtifactIds: [faction.id],
      });
    }
  }

  return warnings;
};

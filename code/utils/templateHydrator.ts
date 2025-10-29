import { Artifact, ProjectTemplate, TemplateApplicationSummary, TemplateArtifactBlueprint } from '../types';
import { composeSeedData } from './artifactDefaults';

interface HydrateTemplateOptions {
  template: ProjectTemplate;
  ownerId: string;
  projectId: string;
  projectTitle: string;
  existingArtifacts: Artifact[];
}

interface HydrationOutcome {
  createdArtifacts: Artifact[];
  skippedBlueprints: TemplateArtifactBlueprint[];
  xpAwarded: number;
  projectTitle: string;
}

const normalizeTitle = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

const applyProjectTokens = (value: string | undefined, projectTitle: string) => {
  if (!value) return value ?? '';
  return value.replace(/\{\{\s*project\s*\}\}/gi, projectTitle);
};

const resolveBlueprintId = (blueprint: TemplateArtifactBlueprint) => {
  if (blueprint.blueprintId) {
    return blueprint.blueprintId;
  }
  return blueprint.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
};

const generateStableId = (
  templateId: string,
  blueprint: TemplateArtifactBlueprint,
  takenIds: Set<string>
) => {
  const base = `tmpl-${templateId}-${resolveBlueprintId(blueprint)}`;
  if (!takenIds.has(base)) {
    takenIds.add(base);
    return base;
  }
  let counter = 1;
  let candidate = `${base}-${counter}`;
  while (takenIds.has(candidate)) {
    counter += 1;
    candidate = `${base}-${counter}`;
  }
  takenIds.add(candidate);
  return candidate;
};

export const hydrateTemplate = ({
  template,
  ownerId,
  projectId,
  projectTitle,
  existingArtifacts,
}: HydrateTemplateOptions): HydrationOutcome => {
  const normalizedExisting = new Map<string, Artifact>();
  const takenIds = new Set(existingArtifacts.map((artifact) => artifact.id));

  existingArtifacts.forEach((artifact) => {
    normalizedExisting.set(normalizeTitle(artifact.title), artifact);
  });

  const blueprintToArtifactId = new Map<string, string>();
  const createdArtifacts: Artifact[] = [];
  const skippedBlueprints: TemplateArtifactBlueprint[] = [];
  let xpAwarded = 0;

  const fallbackArtifactXp = template.artifactXpReward ?? 5;

  template.artifacts.forEach((blueprint) => {
    const hydratedTitle = applyProjectTokens(blueprint.title, projectTitle);
    const normalizedTitle = normalizeTitle(hydratedTitle);
    const existing = normalizedExisting.get(normalizedTitle);

    if (existing) {
      blueprintToArtifactId.set(resolveBlueprintId(blueprint), existing.id);
      skippedBlueprints.push(blueprint);
      return;
    }

    const artifactId = generateStableId(template.id, blueprint, takenIds);

    const artifact: Artifact = {
      id: artifactId,
      ownerId,
      projectId,
      type: blueprint.type,
      title: hydratedTitle,
      summary: applyProjectTokens(blueprint.summary, projectTitle),
      status: blueprint.status ?? 'draft',
      tags: blueprint.tags ? [...blueprint.tags] : [],
      relations: [],
      data: composeSeedData(blueprint.type, blueprint.data, hydratedTitle),
    };

    const artifactXp = blueprint.xpReward ?? fallbackArtifactXp;
    xpAwarded += artifactXp;

    blueprintToArtifactId.set(resolveBlueprintId(blueprint), artifact.id);
    createdArtifacts.push(artifact);
    normalizedExisting.set(normalizedTitle, artifact);
  });

  template.artifacts.forEach((blueprint) => {
    if (!blueprint.relations || blueprint.relations.length === 0) {
      return;
    }

    const sourceId = blueprintToArtifactId.get(resolveBlueprintId(blueprint));
    if (!sourceId) {
      return;
    }

    const artifact = createdArtifacts.find((item) => item.id === sourceId);
    if (!artifact) {
      return;
    }

    const relations = blueprint.relations
      .map((relation) => {
        if (relation.toBlueprintId) {
          const targetId = blueprintToArtifactId.get(relation.toBlueprintId);
          if (targetId) {
            return { toId: targetId, kind: relation.kind };
          }
        }
        if (relation.toExistingTitle) {
          const normalized = normalizeTitle(applyProjectTokens(relation.toExistingTitle, projectTitle));
          const existing = normalizedExisting.get(normalized);
          if (existing) {
            return { toId: existing.id, kind: relation.kind };
          }
        }
        return null;
      })
      .filter((relation): relation is { toId: string; kind: string } => Boolean(relation));

    artifact.relations = relations;
  });

  if (createdArtifacts.length > 0) {
    xpAwarded += template.xpReward ?? 0;
  }

  return {
    createdArtifacts,
    skippedBlueprints,
    xpAwarded,
    projectTitle,
  };
};

export const buildTemplateSummary = (
  template: ProjectTemplate,
  outcome: HydrationOutcome
): TemplateApplicationSummary => {
  return {
    templateId: template.id,
    createdTitles: outcome.createdArtifacts.map((artifact) => artifact.title),
    skippedTitles: outcome.skippedBlueprints.map((blueprint) =>
      applyProjectTokens(blueprint.title, outcome.projectTitle)
    ),
    xpAwarded: outcome.xpAwarded,
  };
};

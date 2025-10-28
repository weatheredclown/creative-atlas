import { Artifact, ArtifactType, Relation, TemplateEntry, TemplateArtifactBlueprint } from '../types';
import { TaskState } from '../types';

const applyTokens = (value: string, projectTitle: string): string =>
  value.replace(/\{\{project\}\}/gi, projectTitle);

const defaultDataForType = (type: ArtifactType): Artifact['data'] => {
  switch (type) {
    case ArtifactType.Conlang:
      return [];
    case ArtifactType.Story:
    case ArtifactType.Scene:
      return [];
    case ArtifactType.Task:
      return { state: TaskState.Todo };
    case ArtifactType.Character:
      return { bio: '', traits: [] };
    case ArtifactType.Wiki:
    case ArtifactType.MagicSystem:
    case ArtifactType.Game:
    case ArtifactType.Faction:
    case ArtifactType.Location:
    case ArtifactType.Repository:
    case ArtifactType.Issue:
    case ArtifactType.Release:
      return {};
    default:
      return {};
  }
};

const toSafeId = (templateId: string, key: string, seed: number, index: number): string =>
  `tmpl-${templateId}-${key}-${seed + index}`;

export interface HydrateTemplateOptions {
  template: TemplateEntry;
  projectId: string;
  projectTitle: string;
  ownerId: string;
  existingArtifacts: Artifact[];
}

export interface HydrateTemplateResult {
  artifacts: Artifact[];
  skippedKeys: string[];
  xpReward: number;
}

const normalize = (value: string): string => value.trim().toLowerCase();

const resolveRelationTarget = (
  relation: NonNullable<TemplateArtifactBlueprint['relations']>[number],
  keyToId: Map<string, string>,
  existingByTitle: Map<string, string>,
  existingIds: Set<string>,
): string | undefined => {
  const normalizedTo = relation.to.trim();
  if (keyToId.has(normalizedTo)) {
    return keyToId.get(normalizedTo);
  }

  const normalizedTitle = normalize(normalizedTo);
  if (existingByTitle.has(normalizedTitle)) {
    return existingByTitle.get(normalizedTitle);
  }

  if (existingIds.has(normalizedTo)) {
    return normalizedTo;
  }

  return undefined;
};

export const hydrateTemplate = ({
  template,
  projectId,
  projectTitle,
  ownerId,
  existingArtifacts,
}: HydrateTemplateOptions): HydrateTemplateResult => {
  const blueprintArtifacts = template.hydrate?.artifacts ?? [];
  if (blueprintArtifacts.length === 0) {
    return { artifacts: [], skippedKeys: [], xpReward: 0 };
  }

  const existingTitles = new Set(existingArtifacts.map((artifact) => normalize(artifact.title)));
  const existingIds = new Set(existingArtifacts.map((artifact) => artifact.id));
  const existingByTitle = new Map(existingArtifacts.map((artifact) => [normalize(artifact.title), artifact.id]));

  const createdPairs: Array<{ blueprint: TemplateArtifactBlueprint; artifact: Artifact }> = [];
  const keyToId = new Map<string, string>();
  const skippedKeys: string[] = [];
  const seed = Date.now();

  blueprintArtifacts.forEach((blueprint, index) => {
    const hydratedTitle = applyTokens(blueprint.title, projectTitle);
    const normalizedTitle = normalize(hydratedTitle);

    if (existingTitles.has(normalizedTitle)) {
      skippedKeys.push(blueprint.key);
      return;
    }

    const artifactId = toSafeId(template.id, blueprint.key, seed, createdPairs.length);
    keyToId.set(blueprint.key, artifactId);
    existingTitles.add(normalizedTitle);

    const hydratedSummary = applyTokens(blueprint.summary, projectTitle);

    const artifact: Artifact = {
      id: artifactId,
      ownerId,
      projectId,
      type: blueprint.type,
      title: hydratedTitle,
      summary: hydratedSummary,
      status: blueprint.status ?? 'draft',
      tags: blueprint.tags ? [...blueprint.tags] : [],
      relations: [],
      data: blueprint.data ?? defaultDataForType(blueprint.type),
    };

    createdPairs.push({ blueprint, artifact });
  });

  const hydratedArtifacts = createdPairs.map(({ blueprint, artifact }): Artifact => {
    if (!blueprint.relations || blueprint.relations.length === 0) {
      return artifact;
    }

    const relations: Relation[] = [];
    blueprint.relations.forEach((relation) => {
      const targetId = resolveRelationTarget(relation, keyToId, existingByTitle, existingIds);
      if (targetId) {
        relations.push({ toId: targetId, kind: relation.kind });
      }
    });

    return relations.length > 0 ? { ...artifact, relations } : artifact;
  });

  const xpReward = template.hydrate?.xpReward ?? Math.max(4, hydratedArtifacts.length * 4);

  return {
    artifacts: hydratedArtifacts,
    skippedKeys,
    xpReward,
  };
};

export const getDefaultDataForType = defaultDataForType;

import type { Artifact } from '../types';

export type ArtifactResidue = Partial<Record<'tags' | 'relations', unknown>>;

export type ArtifactPayload = Omit<Artifact, 'ownerId' | 'tags' | 'relations'> & {
  ownerId?: string;
  tags?: unknown;
  relations?: unknown;
};

export interface NormalizedArtifactResult {
  sanitized: Artifact;
  residue?: ArtifactResidue;
}

const normalizeTags = (tags: unknown): { values: string[]; residue?: unknown } => {
  if (!Array.isArray(tags)) {
    return { values: [], residue: tags };
  }

  const filtered = tags.filter((tag): tag is string => typeof tag === 'string');
  if (filtered.length !== tags.length) {
    return { values: filtered, residue: tags };
  }

  return { values: filtered };
};

const normalizeRelations = (
  relations: unknown,
): { values: Artifact['relations']; residue?: unknown } => {
  if (!Array.isArray(relations)) {
    return { values: [], residue: relations };
  }

  const filtered = relations.filter(
    (relation): relation is Artifact['relations'][number] =>
      Boolean(relation) && typeof relation.toId === 'string' && typeof relation.kind === 'string',
  );

  if (filtered.length !== relations.length) {
    return { values: filtered, residue: relations };
  }

  return { values: filtered };
};

export const normalizeArtifact = (
  artifact: ArtifactPayload,
  ownerId: string,
): NormalizedArtifactResult => {
  const residue: ArtifactResidue = {};

  const { values: tags, residue: tagResidue } = normalizeTags(artifact.tags);
  if (tagResidue !== undefined) {
    residue.tags = tagResidue;
  }

  const { values: relations, residue: relationResidue } = normalizeRelations(artifact.relations);
  if (relationResidue !== undefined) {
    residue.relations = relationResidue;
  }

  const hasResidue = Object.keys(residue).length > 0;

  return {
    sanitized: {
      ...artifact,
      ownerId: artifact.ownerId ?? ownerId,
      tags,
      relations,
    } as Artifact,
    residue: hasResidue ? residue : undefined,
  };
};

export const normalizeArtifacts = (artifacts: ArtifactPayload[], ownerId: string): Artifact[] =>
  artifacts.map((artifact) => normalizeArtifact(artifact, ownerId).sanitized);

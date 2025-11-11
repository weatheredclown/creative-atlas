import { Artifact, ArtifactType, Project } from '../types';

const typeLabelCache = new Map<ArtifactType, string>();

export const formatArtifactType = (type: ArtifactType): string => {
  if (!typeLabelCache.has(type)) {
    typeLabelCache.set(type, type.replace(/([a-z])([A-Z])/g, '$1 $2'));
  }

  return typeLabelCache.get(type) ?? type;
};

const clean = (value?: string): string => value?.replace(/\s+/g, ' ').trim() ?? '';

export const describeArtifact = (artifact: Artifact, project?: Project): string => {
  const summary = clean(artifact.summary);
  const parts = [`${artifact.title} (${formatArtifactType(artifact.type)})`];

  if (project) {
    parts.push(`Project: ${project.title}`);
  }

  if (summary) {
    parts.push(summary);
  }

  return parts.join(' — ');
};

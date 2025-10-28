import { Artifact, ArtifactType, TaskData, TaskState } from '../types';

type MaybeRecord = Record<string, unknown> | undefined;

type Mergeable = Artifact['data'];

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const deepMerge = (target: Mergeable, source: Mergeable): Mergeable => {
  if (Array.isArray(target)) {
    return Array.isArray(source) ? source : target;
  }

  if (isPlainObject(target)) {
    const merged: MaybeRecord = { ...(target as Record<string, unknown>) };
    if (isPlainObject(source)) {
      Object.entries(source).forEach(([key, value]) => {
        const existing = (merged as Record<string, unknown>)[key];
        if (Array.isArray(existing) || Array.isArray(value)) {
          (merged as Record<string, unknown>)[key] = Array.isArray(value) ? value : existing;
          return;
        }
        if (isPlainObject(existing) && isPlainObject(value)) {
          (merged as Record<string, unknown>)[key] = deepMerge(existing as Mergeable, value as Mergeable);
          return;
        }
        (merged as Record<string, unknown>)[key] = value;
      });
    }
    return merged ?? target;
  }

  return source ?? target;
};

export const getDefaultDataForType = (type: ArtifactType, title?: string): Artifact['data'] => {
  switch (type) {
    case ArtifactType.Conlang:
      return [];
    case ArtifactType.Story:
    case ArtifactType.Scene:
      return [];
    case ArtifactType.Task:
      return { state: TaskState.Todo } as TaskData;
    case ArtifactType.Character:
      return { bio: '', traits: [] };
    case ArtifactType.Wiki:
      return { content: `# ${title ?? 'Untitled'}\n\n` };
    case ArtifactType.Location:
      return { description: '', features: [] };
    default:
      return {};
  }
};

export const composeSeedData = (type: ArtifactType, provided: Artifact['data'] | undefined, title?: string): Artifact['data'] => {
  const defaults = getDefaultDataForType(type, title);
  if (provided === undefined) {
    return defaults;
  }
  return deepMerge(defaults, provided);
};

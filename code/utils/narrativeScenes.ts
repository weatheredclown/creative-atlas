import { type Scene } from '../types';

const coerceString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return '';
};

const extractSceneEntries = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === 'object') {
    const scenes = (value as { scenes?: unknown }).scenes;
    if (Array.isArray(scenes)) {
      return scenes;
    }
  }

  return [];
};

const buildSceneList = (
  value: unknown,
  createId: (index: number) => string,
  createTitle: (index: number) => string,
): Scene[] =>
  extractSceneEntries(value)
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const raw = entry as Partial<Scene> & Record<string, unknown>;
      const title = coerceString(raw.title).trim();
      const summary = coerceString(raw.summary);
      const rawId = coerceString(raw.id).trim();

      return {
        id: rawId.length > 0 ? rawId : createId(index),
        title: title.length > 0 ? title : createTitle(index),
        summary,
      } satisfies Scene;
    })
    .filter((scene): scene is Scene => scene !== null);

export const normalizeNarrativeScenes = (value: unknown): Scene[] =>
  buildSceneList(
    value,
    (index) => `scene-${index + 1}`,
    (index) => `Scene ${index + 1}`,
  );

export const recoverNarrativeScenes = (value: unknown, timestamp: number): Scene[] =>
  buildSceneList(
    value,
    (index) => `scene-${timestamp.toString(36)}-${index.toString(36)}`,
    (index) => `Scene ${index + 1}`,
  );

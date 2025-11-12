import { ArtifactType, TASK_STATE, type Artifact } from '../types';
import { createEmptySceneArtifactData } from './sceneArtifacts';

export const getDefaultDataForType = (type: ArtifactType, title: string): Artifact['data'] => {
  switch (type) {
    case ArtifactType.Wiki:
      return { content: `# ${title}\n\n` };
    case ArtifactType.Task:
      return { state: TASK_STATE.Todo };
    case ArtifactType.Timeline:
      return { events: [] };
    case ArtifactType.Conlang:
      return [];
    case ArtifactType.Character:
      return { traits: [] };
    case ArtifactType.Scene:
      return createEmptySceneArtifactData();
    case ArtifactType.MagicSystem:
      return { rules: [] };
    default:
      return undefined;
  }
};

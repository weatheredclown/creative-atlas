import type {
  Artifact,
  ArtifactType,
  CharacterData,
  ConlangLexeme,
  TimelineData,
  WikiData,
  Project,
  ProjectStatus,
  TaskData,
  TaskState,
} from '../types';
import { TASK_STATE } from '../types';

export const countArtifactsByType = (artifacts: Artifact[], type: ArtifactType) =>
  artifacts.filter((artifact) => artifact.type === type).length;

export const countTasksInState = (artifacts: Artifact[], state: TaskState) =>
  artifacts.filter(
    (artifact) =>
      artifact.type === ArtifactType.Task &&
      ((artifact.data as TaskData | undefined)?.state ?? null) === state,
  ).length;

export const getCompletedTaskCount = (artifacts: Artifact[]) =>
  countTasksInState(artifacts, TASK_STATE.Done);

export const getTotalRelations = (artifacts: Artifact[]) =>
  artifacts.reduce((total, artifact) => total + artifact.relations.length, 0);

export const countArtifactsWithRelations = (artifacts: Artifact[], minimum: number) =>
  artifacts.filter((artifact) => artifact.relations.length >= minimum).length;

export const getConlangLexemeCount = (artifacts: Artifact[]) =>
  artifacts
    .filter((artifact) => artifact.type === ArtifactType.Conlang)
    .reduce((count, artifact) => {
      const data = artifact.data as ConlangLexeme[] | undefined;
      return count + (Array.isArray(data) ? data.length : 0);
    }, 0);

export const getWikiWordCount = (artifacts: Artifact[]) =>
  artifacts
    .filter((artifact) => artifact.type === ArtifactType.Wiki)
    .reduce((count, artifact) => {
      const data = artifact.data as WikiData | undefined;
      if (!data || typeof data.content !== 'string') {
        return count;
      }
      const words = data.content.trim().split(/\s+/).filter(Boolean);
      return count + words.length;
    }, 0);

export const getCharacterTraitCount = (artifacts: Artifact[]) =>
  artifacts
    .filter((artifact) => artifact.type === ArtifactType.Character)
    .reduce((count, artifact) => {
      const data = artifact.data as CharacterData | undefined;
      return count + (Array.isArray(data?.traits) ? data.traits.length : 0);
    }, 0);

export const getMaxTimelineEventCount = (artifacts: Artifact[]) =>
  artifacts
    .filter((artifact) => artifact.type === ArtifactType.Timeline)
    .reduce((max, artifact) => {
      const data = artifact.data as TimelineData | undefined;
      const events = Array.isArray(data?.events) ? data.events.length : 0;
      return Math.max(max, events);
    }, 0);

export const countTimelineArtifacts = (artifacts: Artifact[]) =>
  artifacts.filter((artifact) => artifact.type === ArtifactType.Timeline).length;

export const countTaggedArtifacts = (artifacts: Artifact[], minimumTags: number) =>
  artifacts.filter((artifact) => (artifact.tags?.length ?? 0) >= minimumTags).length;

export const countProjectsByStatus = (projects: Project[], status: ProjectStatus) =>
  projects.filter((project) => project.status === status).length;

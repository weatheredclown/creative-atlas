import { atlasDb, ArtifactRecord, ProjectRecord, SettingsRecord } from './atlasDatabase';
import { Artifact, ArtifactType, PaginatedResult, PaginationParams, Project, ProjectStatus, UserSettings } from '../types';
import { artifactSchema, projectSchema, settingsSchema } from './validation';

const applyPagination = <T extends { id: string }>(items: T[], params?: PaginationParams): PaginatedResult<T> => {
  const limit = params?.limit ?? 20;
  const cursor = params?.cursor ?? null;

  if (cursor) {
    const cursorIndex = items.findIndex(item => item.id === cursor);
    if (cursorIndex >= 0) {
      items = items.slice(cursorIndex + 1);
    }
  }

  const paginated = items.slice(0, limit);
  const nextCursor = paginated.length === limit ? paginated[paginated.length - 1]?.id ?? null : null;

  return {
    items: paginated,
    nextCursor,
  };
};

const sortByUpdatedAtDesc = <T extends { updatedAt: string }>(a: T, b: T) => {
  return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
};

export const listProjects = async (ownerId: string, params?: PaginationParams): Promise<PaginatedResult<Project>> => {
  const records = await atlasDb.projects.where('ownerId').equals(ownerId).toArray();
  const sorted = records.sort(sortByUpdatedAtDesc);
  return applyPagination(sorted, params);
};

export const getProjectById = async (ownerId: string, projectId: string): Promise<Project | null> => {
  const project = await atlasDb.projects.get(projectId);
  if (!project || project.ownerId !== ownerId) {
    return null;
  }
  return project;
};

export const saveProject = async (payload: ProjectRecord): Promise<void> => {
  const data = projectSchema.parse(payload);
  await atlasDb.projects.put(data);
};

export const deleteProject = async (ownerId: string, projectId: string): Promise<void> => {
  const project = await atlasDb.projects.get(projectId);
  if (!project || project.ownerId !== ownerId) {
    throw new Error('Project not found or access denied');
  }
  await atlasDb.transaction('rw', atlasDb.projects, atlasDb.artifacts, async () => {
    await atlasDb.projects.delete(projectId);
    await atlasDb.artifacts.where('projectId').equals(projectId).and(a => a.ownerId === ownerId).delete();
  });
};

export const listArtifacts = async (
  ownerId: string,
  projectId: string,
  params?: PaginationParams,
): Promise<PaginatedResult<Artifact>> => {
  const artifacts = await atlasDb.artifacts
    .where({ projectId })
    .and(record => record.ownerId === ownerId)
    .toArray();

  const sorted = artifacts.sort(sortByUpdatedAtDesc);
  return applyPagination(sorted, params);
};

export const saveArtifact = async (payload: ArtifactRecord): Promise<void> => {
  const data = artifactSchema.parse(payload);
  const project = await atlasDb.projects.get(data.projectId);
  if (!project) {
    throw new Error('Cannot attach artifact to unknown project');
  }
  if (project.ownerId !== data.ownerId) {
    throw new Error('Artifact owner must match project owner');
  }
  await atlasDb.artifacts.put(data);
};

export const deleteArtifact = async (ownerId: string, artifactId: string): Promise<void> => {
  const artifact = await atlasDb.artifacts.get(artifactId);
  if (!artifact || artifact.ownerId !== ownerId) {
    throw new Error('Artifact not found or access denied');
  }
  await atlasDb.artifacts.delete(artifactId);
};

export const getOrCreateSettings = async (userId: string): Promise<UserSettings> => {
  const existing = await atlasDb.settings.get(userId);
  if (existing) {
    return existing;
  }
  const now = new Date().toISOString();
  const settings: SettingsRecord = settingsSchema.parse({
    userId,
    xp: 0,
    achievementIds: [],
    lastQuestReset: now,
    createdAt: now,
    updatedAt: now,
  });
  await atlasDb.settings.put(settings);
  return settings;
};

export const updateSettings = async (settings: SettingsRecord): Promise<void> => {
  const validated = settingsSchema.parse(settings);
  await atlasDb.settings.put(validated);
};

export const ensureSeedData = async (ownerId: string): Promise<void> => {
  const existingCount = await atlasDb.projects.where('ownerId').equals(ownerId).count();
  if (existingCount > 0) {
    return;
  }
  const now = new Date().toISOString();
  const demoProject: ProjectRecord = {
    id: 'proj-demo',
    ownerId,
    title: 'Tamenzut',
    summary: 'A series of high-fantasy novels.',
    status: ProjectStatus.Active,
    tags: ['novel', 'fantasy'],
    createdAt: now,
    updatedAt: now,
  };

  const demoArtifacts: ArtifactRecord[] = [
    {
      id: 'art-demo-1',
      ownerId,
      projectId: 'proj-demo',
      type: ArtifactType.Conlang,
      title: 'Darv',
      summary: 'The ancient language of the Darv people.',
      status: 'draft',
      tags: ['language'],
      relations: [],
      data: [
        { id: 'lex-1', lemma: 'brubber', pos: 'adj', gloss: 'strange; unusual', etymology: 'From Old Darv "brub", meaning "other".' },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'art-demo-2',
      ownerId,
      projectId: 'proj-demo',
      type: ArtifactType.Character,
      title: 'Kaelen',
      summary: 'A rogue with a mysterious past.',
      status: 'draft',
      tags: ['protagonist'],
      relations: [{ toId: 'art-demo-1', kind: 'SPEAKS' }],
      data: { bio: 'Kaelen grew up on the streets of the Gilded City, learning to live by his wits.', traits: [{ id: 't1', key: 'Age', value: '27' }] },
      createdAt: now,
      updatedAt: now,
    },
  ];

  await atlasDb.transaction('rw', atlasDb.projects, atlasDb.artifacts, async () => {
    await atlasDb.projects.put(projectSchema.parse(demoProject));
    for (const artifact of demoArtifacts) {
      await atlasDb.artifacts.put(artifactSchema.parse(artifact));
    }
  });
};

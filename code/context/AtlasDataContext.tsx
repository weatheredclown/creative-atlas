import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Artifact, ArtifactType, PaginatedResult, Project, ProjectStatus, UserSettings } from '../types';
import { useAuth } from './AuthContext';
import {
  deleteArtifact as deleteArtifactRecord,
  deleteProject as deleteProjectRecord,
  ensureSeedData,
  getOrCreateSettings,
  listArtifacts,
  listProjects,
  saveArtifact,
  saveProject,
  updateSettings,
} from '../services/atlasRepository';
import { ArtifactRecord, ProjectRecord, SettingsRecord } from '../services/atlasDatabase';
import { PaginationParams } from '../types';

interface CreateProjectInput {
  title: string;
  summary: string;
}

interface UpdateProjectInput {
  title?: string;
  summary?: string;
  status?: ProjectStatus;
  tags?: string[];
}

interface CreateArtifactInput {
  projectId: string;
  type: ArtifactType;
  title: string;
  summary: string;
  status: string;
  tags: string[];
  relations: Artifact['relations'];
  data: Artifact['data'];
}

interface UpdateArtifactInput {
  title?: string;
  summary?: string;
  status?: string;
  tags?: string[];
  relations?: Artifact['relations'];
  data?: Artifact['data'];
}

interface AtlasDataContextValue {
  projects: Project[];
  artifacts: Artifact[];
  settings: UserSettings | null;
  isHydrated: boolean;
  refreshProjects: (params?: PaginationParams) => Promise<PaginatedResult<Project>>;
  refreshArtifacts: (projectId: string, params?: PaginationParams) => Promise<PaginatedResult<Artifact>>;
  createProject: (input: CreateProjectInput) => Promise<Project>;
  updateProject: (projectId: string, input: UpdateProjectInput) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  createArtifact: (input: CreateArtifactInput) => Promise<Artifact>;
  updateArtifact: (artifactId: string, input: UpdateArtifactInput) => Promise<void>;
  deleteArtifact: (artifactId: string) => Promise<void>;
  addXp: (delta: number) => Promise<void>;
  importArtifacts: (items: Artifact[]) => Promise<number>;
}

const AtlasDataContext = createContext<AtlasDataContextValue | undefined>(undefined);

const sortProjects = (items: Project[]): Project[] =>
  [...items].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

const sortArtifacts = (items: Artifact[]): Artifact[] =>
  [...items].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

export const AtlasDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const hydrate = async () => {
      if (!user) {
        setProjects([]);
        setArtifacts([]);
        setSettings(null);
        setIsHydrated(false);
        return;
      }

      await ensureSeedData(user.id);
      const [projectPage, userSettings] = await Promise.all([
        listProjects(user.id, { limit: 100 }),
        getOrCreateSettings(user.id),
      ]);

      let collectedArtifacts: Artifact[] = [];
      for (const project of projectPage.items) {
        const artifactPage = await listArtifacts(user.id, project.id, { limit: 500 });
        collectedArtifacts = collectedArtifacts.concat(artifactPage.items);
      }

      setProjects(sortProjects(projectPage.items));
      setArtifacts(sortArtifacts(collectedArtifacts));
      setSettings(userSettings);
      setIsHydrated(true);
    };

    void hydrate();
  }, [user]);

  const refreshProjects = useCallback(async (params?: PaginationParams) => {
    if (!user) {
      return { items: [], nextCursor: null };
    }
    const page = await listProjects(user.id, params);
    if (!params?.cursor) {
      setProjects(sortProjects(page.items));
    } else {
      setProjects(prev => sortProjects([...prev, ...page.items]));
    }
    return page;
  }, [user]);

  const refreshArtifacts = useCallback(async (projectId: string, params?: PaginationParams) => {
    if (!user) {
      return { items: [], nextCursor: null };
    }
    const page = await listArtifacts(user.id, projectId, params);
    setArtifacts(prev => {
      const filtered = params?.cursor ? prev : prev.filter(item => item.projectId !== projectId);
      return sortArtifacts([...filtered, ...page.items]);
    });
    return page;
  }, [user]);

  const createProject = useCallback(async (input: CreateProjectInput) => {
    if (!user) {
      throw new Error('Must be authenticated to create projects');
    }
    const now = new Date().toISOString();
    const project: ProjectRecord = {
      id: crypto.randomUUID(),
      ownerId: user.id,
      title: input.title,
      summary: input.summary,
      status: ProjectStatus.Active,
      tags: [],
      createdAt: now,
      updatedAt: now,
    };
    await saveProject(project);
    setProjects(prev => sortProjects([project, ...prev]));
    return project;
  }, [user]);

  const updateProjectHandler = useCallback(async (projectId: string, input: UpdateProjectInput) => {
    if (!user) {
      throw new Error('Must be authenticated to update projects');
    }
    const current = projects.find(p => p.id === projectId);
    if (!current) {
      throw new Error('Project not found');
    }
    const updated: ProjectRecord = {
      ...current,
      ...input,
      updatedAt: new Date().toISOString(),
    };
    await saveProject(updated);
    setProjects(prev => sortProjects(prev.map(item => item.id === projectId ? updated : item)));
  }, [projects, user]);

  const deleteProjectHandler = useCallback(async (projectId: string) => {
    if (!user) {
      throw new Error('Must be authenticated to delete projects');
    }
    await deleteProjectRecord(user.id, projectId);
    setProjects(prev => prev.filter(project => project.id !== projectId));
    setArtifacts(prev => prev.filter(artifact => artifact.projectId !== projectId));
  }, [user]);

  const createArtifact = useCallback(async (input: CreateArtifactInput) => {
    if (!user) {
      throw new Error('Must be authenticated to create artifacts');
    }
    const now = new Date().toISOString();
    const artifact: ArtifactRecord = {
      id: crypto.randomUUID(),
      ownerId: user.id,
      projectId: input.projectId,
      type: input.type,
      title: input.title,
      summary: input.summary,
      status: input.status,
      tags: input.tags,
      relations: input.relations,
      data: input.data,
      createdAt: now,
      updatedAt: now,
    };
    await saveArtifact(artifact);
    setArtifacts(prev => sortArtifacts([artifact, ...prev]));
    return artifact;
  }, [user]);

  const updateArtifactHandler = useCallback(async (artifactId: string, input: UpdateArtifactInput) => {
    if (!user) {
      throw new Error('Must be authenticated to update artifacts');
    }
    const current = artifacts.find(a => a.id === artifactId);
    if (!current) {
      throw new Error('Artifact not found');
    }
    const updated: ArtifactRecord = {
      ...current,
      ...input,
      relations: input.relations ?? current.relations,
      data: input.data ?? current.data,
      updatedAt: new Date().toISOString(),
    };
    await saveArtifact(updated);
    setArtifacts(prev => sortArtifacts(prev.map(item => item.id === artifactId ? updated : item)));
  }, [artifacts, user]);

  const deleteArtifactHandler = useCallback(async (artifactId: string) => {
    if (!user) {
      throw new Error('Must be authenticated to delete artifacts');
    }
    await deleteArtifactRecord(user.id, artifactId);
    setArtifacts(prev => prev.filter(artifact => artifact.id !== artifactId));
  }, [user]);

  const addXp = useCallback(async (delta: number) => {
    if (!settings || !user) {
      return;
    }
    const next: SettingsRecord = {
      ...settings,
      xp: settings.xp + delta,
      updatedAt: new Date().toISOString(),
    };
    await updateSettings(next);
    setSettings(next);
  }, [settings, user]);

  const importArtifactsBulk = useCallback(async (items: Artifact[]) => {
    if (!user) {
      throw new Error('Must be authenticated to import artifacts');
    }
    if (items.length === 0) {
      return 0;
    }
    const now = new Date().toISOString();
    const existingIds = new Set(artifacts.map(artifact => artifact.id));
    const prepared: ArtifactRecord[] = items
      .filter(item => !existingIds.has(item.id))
      .map(item => ({
        ...item,
        ownerId: user.id,
        createdAt: item.createdAt ?? now,
        updatedAt: now,
      }));

    if (prepared.length === 0) {
      return 0;
    }

    for (const artifact of prepared) {
      await saveArtifact(artifact);
    }

    setArtifacts(prev => sortArtifacts([...prev, ...prepared]));
    return prepared.length;
  }, [artifacts, user]);

  const value = useMemo<AtlasDataContextValue>(() => ({
    projects,
    artifacts,
    settings,
    isHydrated,
    refreshProjects,
    refreshArtifacts,
    createProject,
    updateProject: updateProjectHandler,
    deleteProject: deleteProjectHandler,
    createArtifact,
    updateArtifact: updateArtifactHandler,
    deleteArtifact: deleteArtifactHandler,
    addXp,
    importArtifacts: importArtifactsBulk,
  }), [addXp, artifacts, createArtifact, createProject, deleteArtifactHandler, deleteProjectHandler, importArtifactsBulk, isHydrated, projects, refreshArtifacts, refreshProjects, settings, updateArtifactHandler, updateProjectHandler]);

  return <AtlasDataContext.Provider value={value}>{children}</AtlasDataContext.Provider>;
};

export const useAtlasData = (): AtlasDataContextValue => {
  const ctx = useContext(AtlasDataContext);
  if (!ctx) {
    throw new Error('useAtlasData must be used within an AtlasDataProvider');
  }
  return ctx;
};

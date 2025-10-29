import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Artifact, Project, ProjectStatus, UserProfile, UserSettings } from '../types';
import { createSeedWorkspace } from '../seedData';
import { advanceStreak, formatDateKey } from '../utils/streak';
import { useAuth } from './AuthContext';
import {
  ArtifactDraft,
  createArtifactsViaApi,
  createProjectViaApi,
  fetchProfile,
  fetchProjectArtifacts,
  fetchProjects,
  incrementProfileXp,
  isDataApiConfigured,
  updateArtifactViaApi,
  updateProfileViaApi,
  updateProjectViaApi,
} from '../services/dataApi';

interface ProfileUpdate
  extends Partial<Omit<UserProfile, 'settings' | 'achievementsUnlocked' | 'questlinesClaimed'>> {
  achievementsUnlocked?: string[];
  questlinesClaimed?: string[];
  settings?: Partial<UserSettings>;
}

interface UserDataContextValue {
  projects: Project[];
  artifacts: Artifact[];
  profile: UserProfile | null;
  loading: boolean;
  canLoadMoreProjects: boolean;
  loadMoreProjects: () => Promise<void>;
  ensureProjectArtifacts: (projectId: string) => Promise<void>;
  canLoadMoreArtifacts: (projectId: string) => boolean;
  loadMoreArtifacts: (projectId: string) => Promise<void>;
  createProject: (input: { title: string; summary?: string }) => Promise<Project | null>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<Project | null>;
  createArtifact: (projectId: string, draft: ArtifactDraft) => Promise<Artifact | null>;
  createArtifactsBulk: (projectId: string, drafts: ArtifactDraft[]) => Promise<Artifact[]>;
  updateArtifact: (artifactId: string, updates: Partial<Artifact>) => Promise<Artifact | null>;
  mergeArtifacts: (projectId: string, artifacts: Artifact[]) => void;
  updateProfile: (update: ProfileUpdate) => Promise<void>;
  addXp: (amount: number) => Promise<void>;
}

const UserDataContext = createContext<UserDataContextValue | undefined>(undefined);

const defaultSettings: UserSettings = {
  theme: 'system',
  aiTipsEnabled: true,
};

const createDefaultProfile = (
  uid: string,
  email: string | null,
  displayName: string | null,
  photoURL: string | null,
  xp: number,
): UserProfile => {
  const normalizedEmail = email ?? '';
  const fallbackDisplayName = normalizedEmail ? normalizedEmail.split('@')[0] ?? 'Creator' : 'Creator';
  const todayKey = formatDateKey(new Date());
  const hasXp = xp > 0;
  return {
    uid,
    email: normalizedEmail,
    displayName: displayName && displayName.trim().length > 0 ? displayName : fallbackDisplayName,
    photoURL: photoURL ?? undefined,
    xp,
    streakCount: hasXp ? 1 : 0,
    bestStreak: hasXp ? 1 : 0,
    lastActiveDate: hasXp ? todayKey : undefined,
    achievementsUnlocked: [],
    questlinesClaimed: [],
    settings: { ...defaultSettings },
  };
};

const normalizeProjects = (projects: Project[], ownerId: string): Project[] =>
  projects.map((project) => ({ ...project, ownerId }));

const normalizeArtifacts = (artifacts: Artifact[], ownerId: string): Artifact[] =>
  artifacts.map((artifact) => ({ ...artifact, ownerId }));

const groupArtifactsByProject = (artifacts: Artifact[]): Record<string, Artifact[]> => {
  return artifacts.reduce<Record<string, Artifact[]>>((acc, artifact) => {
    if (!acc[artifact.projectId]) {
      acc[artifact.projectId] = [];
    }
    acc[artifact.projectId].push(artifact);
    return acc;
  }, {});
};

const mergeArtifactLists = (existing: Artifact[], incoming: Artifact[]): Artifact[] => {
  if (incoming.length === 0) {
    return existing;
  }
  const map = new Map(existing.map((artifact) => [artifact.id, artifact]));
  incoming.forEach((artifact) => {
    map.set(artifact.id, artifact);
  });
  return Array.from(map.values());
};

export const UserDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isGuestMode, getIdToken } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectPageToken, setProjectPageToken] = useState<string | null | undefined>(undefined);
  const [artifactsByProject, setArtifactsByProject] = useState<Record<string, Artifact[]>>({});
  const [artifactPageTokens, setArtifactPageTokens] = useState<Record<string, string | null | undefined>>({});
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const artifacts = useMemo(() => Object.values(artifactsByProject).flat(), [artifactsByProject]);

  useEffect(() => {
    let cancelled = false;

    if (isGuestMode) {
      setLoading(true);
      const guestId = 'guest';
      const seed = createSeedWorkspace(guestId);
      const seededProjects = normalizeProjects(seed.projects, guestId);
      const seededArtifacts = normalizeArtifacts(seed.artifacts, guestId);
      const grouped = groupArtifactsByProject(seededArtifacts);
      if (!cancelled) {
        setProjects(seededProjects);
        setArtifactsByProject(grouped);
        setArtifactPageTokens({});
        setProjectPageToken(null);
        setProfile(createDefaultProfile(guestId, null, 'Guest Creator', null, seed.xp));
        setLoading(false);
      }
      return () => {
        cancelled = true;
      };
    }

    if (!user) {
      setProjects([]);
      setArtifactsByProject({});
      setArtifactPageTokens({});
      setProjectPageToken(undefined);
      setProfile(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);

    void (async () => {
      try {
        const token = await getIdToken();
        if (!token || !isDataApiConfigured) {
          throw new Error('Data API is not available.');
        }
        const [profileData, projectData] = await Promise.all([
          fetchProfile(token),
          fetchProjects(token),
        ]);
        if (cancelled) {
          return;
        }
        setProfile(profileData);
        setProjects(projectData.projects);
        setProjectPageToken(projectData.nextPageToken ?? null);
        setArtifactsByProject({});
        setArtifactPageTokens({});
      } catch (error) {
        console.error('Failed to load workspace from API', error);
        if (!cancelled) {
          setProfile(createDefaultProfile(user.uid, user.email, user.displayName, user.photoURL, 0));
          setProjects([]);
          setArtifactsByProject({});
          setArtifactPageTokens({});
          setProjectPageToken(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, isGuestMode, getIdToken]);

  const loadProjectArtifacts = useCallback(
    async (projectId: string, { reset = false }: { reset?: boolean } = {}) => {
      if (isGuestMode) {
        return;
      }

      const nextToken = reset ? undefined : artifactPageTokens[projectId];
      if (!reset && nextToken === null) {
        return;
      }

      try {
        const token = await getIdToken();
        if (!token || !isDataApiConfigured) {
          throw new Error('Data API is not available.');
        }
        const response = await fetchProjectArtifacts(token, projectId, {
          pageToken: nextToken,
        });
        setArtifactsByProject((current) => {
          const existing = reset ? [] : current[projectId] ?? [];
          const merged = mergeArtifactLists(existing, response.artifacts);
          return {
            ...current,
            [projectId]: merged,
          };
        });
        setArtifactPageTokens((current) => ({
          ...current,
          [projectId]: response.nextPageToken ?? null,
        }));
      } catch (error) {
        console.error('Failed to load project artifacts', error);
      }
    },
    [artifactPageTokens, getIdToken, isGuestMode],
  );

  const ensureProjectArtifacts = useCallback(
    async (projectId: string) => {
      if (isGuestMode) {
        return;
      }
      if ((artifactsByProject[projectId] ?? []).length > 0) {
        return;
      }
      await loadProjectArtifacts(projectId, { reset: true });
    },
    [artifactsByProject, isGuestMode, loadProjectArtifacts],
  );

  const loadMoreArtifacts = useCallback(
    async (projectId: string) => {
      if (isGuestMode) {
        return;
      }
      if (artifactPageTokens[projectId] === null) {
        return;
      }
      await loadProjectArtifacts(projectId);
    },
    [artifactPageTokens, isGuestMode, loadProjectArtifacts],
  );

  const canLoadMoreArtifacts = useCallback(
    (projectId: string) => {
      const token = artifactPageTokens[projectId];
      if (typeof token === 'undefined') {
        // Not loaded yet; allow callers to trigger a load.
        return true;
      }
      return token !== null;
    },
    [artifactPageTokens],
  );

  const loadMoreProjects = useCallback(async () => {
    if (isGuestMode) {
      return;
    }
    if (!projectPageToken) {
      return;
    }
    try {
      const token = await getIdToken();
      if (!token || !isDataApiConfigured) {
        throw new Error('Data API is not available.');
      }
      const response = await fetchProjects(token, { pageToken: projectPageToken });
      setProjects((current) => [...current, ...response.projects]);
      setProjectPageToken(response.nextPageToken ?? null);
    } catch (error) {
      console.error('Failed to load additional projects', error);
    }
  }, [getIdToken, isGuestMode, projectPageToken]);

  const mergeArtifacts = useCallback((projectId: string, incoming: Artifact[]) => {
    if (incoming.length === 0) {
      return;
    }
    setArtifactsByProject((current) => {
      const existing = current[projectId] ?? [];
      return {
        ...current,
        [projectId]: mergeArtifactLists(existing, incoming),
      };
    });
    setArtifactPageTokens((current) => ({
      ...current,
      [projectId]: current[projectId] ?? null,
    }));
  }, []);

  const createProject = useCallback(
    async ({ title, summary }: { title: string; summary?: string }) => {
      if (!profile) {
        return null;
      }

      if (isGuestMode || !isDataApiConfigured) {
        const project: Project = {
          id: `proj-${Date.now()}`,
          ownerId: profile.uid,
          title,
          summary: summary ?? '',
          status: ProjectStatus.Active,
          tags: [],
        };
        setProjects((current) => [...current, project]);
        setArtifactsByProject((current) => ({ ...current, [project.id]: [] }));
        setArtifactPageTokens((current) => ({ ...current, [project.id]: null }));
        return project;
      }

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('Missing authentication token.');
        }
        const created = await createProjectViaApi(token, {
          title,
          summary,
          status: ProjectStatus.Active,
          tags: [],
        });
        setProjects((current) => [...current, created]);
        setArtifactsByProject((current) => ({ ...current, [created.id]: [] }));
        setArtifactPageTokens((current) => ({ ...current, [created.id]: null }));
        return created;
      } catch (error) {
        console.error('Failed to create project', error);
        return null;
      }
    },
    [getIdToken, isDataApiConfigured, isGuestMode, profile],
  );

  const updateProject = useCallback(
    async (projectId: string, updates: Partial<Project>) => {
      setProjects((current) =>
        current.map((project) => (project.id === projectId ? { ...project, ...updates } : project)),
      );

      if (isGuestMode || !isDataApiConfigured) {
        return projects.find((project) => project.id === projectId) ?? null;
      }

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('Missing authentication token.');
        }
        const sanitized: Partial<Project> = {};
        if (updates.title !== undefined) sanitized.title = updates.title;
        if (updates.summary !== undefined) sanitized.summary = updates.summary;
        if (updates.status !== undefined) sanitized.status = updates.status;
        if (updates.tags !== undefined) sanitized.tags = updates.tags;
        const updated = await updateProjectViaApi(token, projectId, sanitized);
        setProjects((current) =>
          current.map((project) => (project.id === projectId ? { ...project, ...updated } : project)),
        );
        return updated;
      } catch (error) {
        console.error('Failed to update project', error);
        return null;
      }
    },
    [getIdToken, isDataApiConfigured, isGuestMode, projects],
  );

  const createArtifactsBulk = useCallback(
    async (projectId: string, drafts: ArtifactDraft[]) => {
      if (drafts.length === 0) {
        return [];
      }

      if (isGuestMode || !isDataApiConfigured) {
        const ownerId = profile?.uid ?? 'guest';
        const timestamp = Date.now();
        const artifactsToAdd = drafts.map((draft, index) => ({
          id: draft.id ?? `art-${timestamp + index}`,
          ownerId,
          projectId,
          type: draft.type,
          title: draft.title,
          summary: draft.summary ?? '',
          status: draft.status ?? 'idea',
          tags: draft.tags ?? [],
          relations: draft.relations ?? [],
          data: draft.data ?? {},
        }));
        mergeArtifacts(projectId, artifactsToAdd);
        return artifactsToAdd;
      }

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('Missing authentication token.');
        }
        const created = await createArtifactsViaApi(token, projectId, drafts);
        mergeArtifacts(projectId, created);
        return created;
      } catch (error) {
        console.error('Failed to create artifacts', error);
        return [];
      }
    },
    [getIdToken, isDataApiConfigured, isGuestMode, mergeArtifacts, profile?.uid],
  );

  const createArtifact = useCallback(
    async (projectId: string, draft: ArtifactDraft) => {
      const results = await createArtifactsBulk(projectId, [draft]);
      return results[0] ?? null;
    },
    [createArtifactsBulk],
  );

  const updateArtifact = useCallback(
    async (artifactId: string, updates: Partial<Artifact>) => {
      setArtifactsByProject((current) => {
        const next = { ...current };
        Object.keys(next).forEach((projectId) => {
          const list = next[projectId];
          if (list.some((artifact) => artifact.id === artifactId)) {
            next[projectId] = list.map((artifact) =>
              artifact.id === artifactId ? { ...artifact, ...updates } : artifact,
            );
          }
        });
        return next;
      });

      if (isGuestMode || !isDataApiConfigured) {
        return artifacts.find((artifact) => artifact.id === artifactId) ?? null;
      }

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('Missing authentication token.');
        }
        const sanitized: Partial<Artifact> = {};
        if (updates.title !== undefined) sanitized.title = updates.title;
        if (updates.summary !== undefined) sanitized.summary = updates.summary;
        if (updates.status !== undefined) sanitized.status = updates.status;
        if (updates.tags !== undefined) sanitized.tags = updates.tags;
        if (updates.relations !== undefined) sanitized.relations = updates.relations;
        if (updates.data !== undefined) sanitized.data = updates.data;
        const updated = await updateArtifactViaApi(token, artifactId, sanitized);
        setArtifactsByProject((current) => {
          const next = { ...current };
          Object.keys(next).forEach((projectId) => {
            const list = next[projectId];
            if (list.some((artifact) => artifact.id === artifactId)) {
              next[projectId] = list.map((artifact) =>
                artifact.id === artifactId ? updated : artifact,
              );
            }
          });
          return next;
        });
        return updated;
      } catch (error) {
        console.error('Failed to update artifact', error);
        return null;
      }
    },
    [artifacts, getIdToken, isDataApiConfigured, isGuestMode],
  );

  const updateProfile = useCallback(
    async (update: ProfileUpdate) => {
      setProfile((current) => {
        if (!current) {
          return current;
        }
        const nextAchievements = update.achievementsUnlocked
          ? Array.from(new Set([...current.achievementsUnlocked, ...update.achievementsUnlocked]))
          : current.achievementsUnlocked;
        const nextQuestlines = update.questlinesClaimed
          ? Array.from(new Set([...current.questlinesClaimed, ...update.questlinesClaimed]))
          : current.questlinesClaimed;
        const nextSettings = update.settings
          ? { ...current.settings, ...update.settings }
          : current.settings;
        return {
          ...current,
          ...update,
          achievementsUnlocked: nextAchievements,
          questlinesClaimed: nextQuestlines,
          settings: nextSettings,
        };
      });

      if (isGuestMode || !isDataApiConfigured) {
        return;
      }

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('Missing authentication token.');
        }
        const payload: ProfileUpdate = {
          ...update,
          achievementsUnlocked: nextAchievements,
          questlinesClaimed: nextQuestlines,
          settings: nextSettings,
        };
        const response = await updateProfileViaApi(token, payload);
        setProfile(response);
      } catch (error) {
        console.error('Failed to persist profile update', error);
      }
    },
    [getIdToken, isDataApiConfigured, isGuestMode],
  );

  const addXp = useCallback(
    async (amount: number) => {
      if (amount === 0) {
        return;
      }
      setProfile((current) => {
        if (!current) {
          return current;
        }
        const nextXp = Math.max(0, current.xp + amount);
        if (amount > 0) {
          const todayKey = formatDateKey(new Date());
          const nextStreak = advanceStreak(
            {
              streakCount: current.streakCount,
              bestStreak: current.bestStreak,
              lastActiveDate: current.lastActiveDate,
            },
            todayKey,
          );
          return {
            ...current,
            xp: nextXp,
            streakCount: nextStreak.streakCount,
            bestStreak: nextStreak.bestStreak,
            lastActiveDate: nextStreak.lastActiveDate,
          };
        }
        return { ...current, xp: nextXp };
      });

      if (isGuestMode || !isDataApiConfigured) {
        return;
      }

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('Missing authentication token.');
        }
        const updated = await incrementProfileXp(token, amount);
        setProfile(updated);
      } catch (error) {
        console.error('Failed to persist XP changes', error);
      }
    },
    [getIdToken, isDataApiConfigured, isGuestMode],
  );

  const value = useMemo<UserDataContextValue>(
    () => ({
      projects,
      artifacts,
      profile,
      loading,
      canLoadMoreProjects: Boolean(projectPageToken),
      loadMoreProjects,
      ensureProjectArtifacts,
      canLoadMoreArtifacts,
      loadMoreArtifacts,
      createProject,
      updateProject,
      createArtifact,
      createArtifactsBulk,
      updateArtifact,
      mergeArtifacts,
      updateProfile,
      addXp,
    }),
    [
      projects,
      artifacts,
      profile,
      loading,
      projectPageToken,
      loadMoreProjects,
      ensureProjectArtifacts,
      canLoadMoreArtifacts,
      loadMoreArtifacts,
      createProject,
      updateProject,
      createArtifact,
      createArtifactsBulk,
      updateArtifact,
      mergeArtifacts,
      updateProfile,
      addXp,
    ],
  );

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
};

export const useUserData = (): UserDataContextValue => {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
};

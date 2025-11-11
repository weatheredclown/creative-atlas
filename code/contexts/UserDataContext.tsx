import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Artifact,
  MemorySyncConversation,
  MemorySyncStatus,
  Project,
  ProjectStatus,
  UserProfile,
  UserSettings,
} from '../types';
import { createSeedWorkspace } from '../seedData';
import { advanceStreak, formatDateKey } from '../utils/streak';
import { useAuth } from './AuthContext';
import {
  ArtifactDraft,
  createArtifactsViaApi,
  createProjectViaApi,
  deleteArtifactViaApi,
  deleteProjectViaApi,
  deleteAccountViaApi,
  fetchProfile,
  fetchProjectArtifacts,
  fetchProjects,
  incrementProfileXp,
  isDataApiConfigured,
  updateArtifactViaApi,
  updateProfileViaApi,
  updateProjectViaApi,
} from '../services/dataApi';
import {
  type ArtifactPayload,
  type ArtifactResidue,
  normalizeArtifact,
  normalizeArtifacts,
} from '../utils/artifactNormalization';
import { createArtifactResidueStore } from '../utils/artifactResidueStore';

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
  error: string | null;
  clearError: () => void;
  canLoadMoreProjects: boolean;
  loadMoreProjects: () => Promise<void>;
  ensureProjectArtifacts: (projectId: string) => Promise<void>;
  canLoadMoreArtifacts: (projectId: string) => boolean;
  loadMoreArtifacts: (projectId: string) => Promise<void>;
  createProject: (input: { title: string; summary?: string; tags?: string[] }) => Promise<Project | null>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<Project | null>;
  deleteProject: (projectId: string) => Promise<boolean>;
  createArtifact: (projectId: string, draft: ArtifactDraft) => Promise<Artifact | null>;
  createArtifactsBulk: (projectId: string, drafts: ArtifactDraft[]) => Promise<Artifact[]>;
  updateArtifact: (artifactId: string, updates: Partial<Artifact>) => Promise<Artifact | null>;
  deleteArtifact: (artifactId: string) => Promise<boolean>;
  mergeArtifacts: (projectId: string, artifacts: Artifact[]) => void;
  memoryConversations: MemorySyncConversation[];
  updateMemorySuggestionStatus: (
    conversationId: string,
    suggestionId: string,
    status: MemorySyncStatus,
  ) => void;
  updateProfile: (update: ProfileUpdate) => Promise<void>;
  addXp: (amount: number) => Promise<void>;
  deleteAccountData: () => Promise<boolean>;
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
  projects.map((project) => ({
    ...project,
    ownerId: project.ownerId ?? ownerId,
    tags: Array.isArray(project.tags)
      ? project.tags.filter((tag): tag is string => typeof tag === 'string')
      : [],
  }));

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

const toDisplayMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message.length > 0 && message !== fallback) {
      return `${fallback} (${message})`;
    }
  }
  return fallback;
};

export const UserDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isGuestMode, getIdToken } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectPageToken, setProjectPageToken] = useState<string | null | undefined>(undefined);
  const [artifactsByProject, setArtifactsByProject] = useState<Record<string, Artifact[]>>({});
  const [artifactPageTokens, setArtifactPageTokens] = useState<Record<string, string | null | undefined>>({});
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [memoryConversations, setMemoryConversations] = useState<MemorySyncConversation[]>([]);
  const artifactResidueStoreRef = useRef(createArtifactResidueStore());

  const clearResidueField = useCallback((artifactId: string, field: keyof ArtifactResidue) => {
    artifactResidueStoreRef.current.clearField(artifactId, field);
  }, []);

  const setResidueField = useCallback(
    (artifactId: string, field: keyof ArtifactResidue, value: unknown) => {
      artifactResidueStoreRef.current.setField(artifactId, field, value);
    },
    [],
  );

  const recordArtifactResidue = useCallback(
    (artifactId: string, residue?: ArtifactResidue) => {
      artifactResidueStoreRef.current.record(artifactId, residue);
    },
    [],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearWorkspaceState = useCallback(() => {
    setProjects([]);
    setProjectPageToken(null);
    setArtifactsByProject({});
    setArtifactPageTokens({});
    setProfile(null);
    setMemoryConversations([]);
    setLoading(false);
    setError(null);
    artifactResidueStoreRef.current.reset();
  }, []);

  const reportError = useCallback(
    (scope: string, err: unknown, fallback: string, options: { suppressState?: boolean } = {}) => {
      console.error(scope, err);
      if (options.suppressState) {
        return;
      }
      setError(toDisplayMessage(err, fallback));
    },
    [],
  );

  const artifacts = useMemo(() => Object.values(artifactsByProject).flat(), [artifactsByProject]);

  const sanitizeArtifacts = useCallback(
    (incoming: ArtifactPayload[]): Artifact[] => {
      const ownerId = profile?.uid ?? user?.uid ?? 'unknown-owner';
      return incoming.map((artifact) => {
        const { sanitized, residue } = normalizeArtifact(artifact, ownerId);
        recordArtifactResidue(sanitized.id, residue);
        return sanitized;
      });
    },
    [profile?.uid, recordArtifactResidue, user?.uid],
  );

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
        setMemoryConversations(seed.memoryConversations);
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
      setMemoryConversations([]);
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
        setProjects(normalizeProjects(projectData.projects, user.uid));
        setProjectPageToken(projectData.nextPageToken ?? null);
        setArtifactsByProject({});
        setArtifactPageTokens({});
        setMemoryConversations([]);
        setError(null);
      } catch (error) {
        reportError(
          'Failed to load workspace from API',
          error,
          'We could not load your workspace data from the Creative Atlas service. Please refresh once the service is available.',
          { suppressState: cancelled },
        );
        if (!cancelled) {
          setProfile(createDefaultProfile(user.uid, user.email, user.displayName, user.photoURL, 0));
          setProjects([]);
          setArtifactsByProject({});
          setArtifactPageTokens({});
          setProjectPageToken(null);
          setMemoryConversations([]);
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
  }, [user, isGuestMode, getIdToken, reportError]);

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
        const normalizedArtifacts = sanitizeArtifacts(response.artifacts);
        setArtifactsByProject((current) => {
          const existing = reset ? [] : current[projectId] ?? [];
          const merged = mergeArtifactLists(existing, normalizedArtifacts);
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
        reportError(
          'Failed to load project artifacts',
          error,
          'We could not load this project\'s artifacts. Please try again after the data service is available.',
        );
      }
    },
    [artifactPageTokens, getIdToken, isGuestMode, reportError, sanitizeArtifacts],
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
      const normalizedProjects = normalizeProjects(
        response.projects,
        user?.uid ?? profile?.uid ?? 'unknown-owner',
      );
      setProjects((current) => [...current, ...normalizedProjects]);
      setProjectPageToken(response.nextPageToken ?? null);
    } catch (error) {
      reportError(
        'Failed to load additional projects',
        error,
        'We could not load more projects from the data service. Please try again later.',
      );
    }
  }, [getIdToken, isGuestMode, profile?.uid, projectPageToken, reportError, user?.uid]);

  const mergeArtifacts = useCallback(
    (projectId: string, incoming: Artifact[]) => {
      if (incoming.length === 0) {
        return;
      }
      const normalizedIncoming = sanitizeArtifacts(incoming);
      setArtifactsByProject((current) => {
        const existing = current[projectId] ?? [];
        return {
          ...current,
          [projectId]: mergeArtifactLists(existing, normalizedIncoming),
        };
      });
      setArtifactPageTokens((current) => ({
        ...current,
        [projectId]: current[projectId] ?? null,
      }));
    },
    [sanitizeArtifacts],
  );

  const updateMemorySuggestionStatus = useCallback(
    (conversationId: string, suggestionId: string, status: MemorySyncStatus) => {
      setMemoryConversations((previous) =>
        previous.map((conversation) => {
          if (conversation.id !== conversationId) {
            return conversation;
          }

          let suggestionChanged = false;
          const suggestions = conversation.suggestions.map((suggestion) => {
            if (suggestion.id !== suggestionId) {
              return suggestion;
            }
            if (suggestion.status === status) {
              return suggestion;
            }
            suggestionChanged = true;
            return {
              ...suggestion,
              status,
              updatedAt: new Date().toISOString(),
            };
          });

          if (!suggestionChanged) {
            return conversation;
          }

          const hasApproved = suggestions.some((item) => item.status === 'approved');
          const lastSyncedAt =
            status === 'approved'
              ? new Date().toISOString()
              : hasApproved
              ? conversation.lastSyncedAt
              : undefined;

          return {
            ...conversation,
            suggestions,
            lastSyncedAt,
          };
        }),
      );
    },
    [],
  );

  const createProject = useCallback(
    async ({ title, summary, tags }: { title: string; summary?: string; tags?: string[] }) => {
      if (!profile) {
        return null;
      }

      const normalizedTags = Array.from(
        new Set(
          (tags ?? [])
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0),
        ),
      );

      if (isGuestMode || !isDataApiConfigured) {
        const project: Project = {
          id: `proj-${Date.now()}`,
          ownerId: profile.uid,
          title,
          summary: summary ?? '',
          status: ProjectStatus.Active,
          tags: normalizedTags,
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
          tags: normalizedTags,
        });
        setProjects((current) => [...current, created]);
        setArtifactsByProject((current) => ({ ...current, [created.id]: [] }));
        setArtifactPageTokens((current) => ({ ...current, [created.id]: null }));
        return created;
      } catch (error) {
        reportError(
          'Failed to create project',
          error,
          'We could not create the project. Please try again once the data service is back online.',
        );
        return null;
      }
    },
    [getIdToken, isGuestMode, profile, reportError],
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
        reportError(
          'Failed to update project',
          error,
          'We could not update the project. Your latest changes may not be saved.',
        );
        return null;
      }
    },
    [getIdToken, isGuestMode, projects, reportError],
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      const removeFromState = () => {
        setProjects((current) => current.filter((project) => project.id !== projectId));
        setArtifactsByProject((current) => {
          if (!(projectId in current)) {
            return current;
          }
          const next = { ...current };
          delete next[projectId];
          return next;
        });
        setArtifactPageTokens((current) => {
          if (!(projectId in current)) {
            return current;
          }
          const next = { ...current };
          delete next[projectId];
          return next;
        });
      };

      if (isGuestMode || !isDataApiConfigured) {
        removeFromState();
        return true;
      }

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('Missing authentication token.');
        }
        await deleteProjectViaApi(token, projectId);
        removeFromState();
        return true;
      } catch (error) {
        reportError(
          'Failed to delete project',
          error,
          'We could not delete the project. Please try again later.',
        );
        return false;
      }
    },
    [getIdToken, isGuestMode, reportError],
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
        const normalizedGuestArtifacts = sanitizeArtifacts(artifactsToAdd);
        mergeArtifacts(projectId, normalizedGuestArtifacts);
        return normalizedGuestArtifacts;
      }

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('Missing authentication token.');
        }
        const created = await createArtifactsViaApi(token, projectId, drafts);
        const normalizedCreated = sanitizeArtifacts(created);
        mergeArtifacts(projectId, normalizedCreated);
        return normalizedCreated;
      } catch (error) {
        reportError(
          'Failed to create artifacts',
          error,
          'We could not create the new artifacts. Please try again later.',
        );
        return [];
      }
    },
    [getIdToken, isGuestMode, mergeArtifacts, profile?.uid, reportError, sanitizeArtifacts],
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

      (['tags', 'relations'] as const).forEach((field) => {
        if (!Object.prototype.hasOwnProperty.call(updates, field)) {
          return;
        }
        const value = updates[field];
        if (field === 'tags') {
          if (Array.isArray(value) && value.every((tag) => typeof tag === 'string')) {
            clearResidueField(artifactId, 'tags');
          } else if (value !== undefined) {
            setResidueField(artifactId, 'tags', value);
          }
        }
        if (field === 'relations') {
          if (
            Array.isArray(value) &&
            value.every(
              (relation) =>
                relation && typeof relation.toId === 'string' && typeof relation.kind === 'string',
            )
          ) {
            clearResidueField(artifactId, 'relations');
          } else if (value !== undefined) {
            setResidueField(artifactId, 'relations', value);
          }
        }
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
        const [normalizedUpdated] = sanitizeArtifacts([updated]);
        setArtifactsByProject((current) => {
          const next = { ...current };
          Object.keys(next).forEach((projectId) => {
            const list = next[projectId];
            if (list.some((artifact) => artifact.id === artifactId)) {
              next[projectId] = list.map((artifact) =>
                artifact.id === artifactId ? normalizedUpdated : artifact,
              );
            }
          });
          return next;
        });
        return normalizedUpdated;
      } catch (error) {
        reportError(
          'Failed to update artifact',
          error,
          'We could not update the artifact. Your latest changes may not be saved.',
        );
        return null;
      }
    },
    [
      artifacts,
      clearResidueField,
      getIdToken,
      isGuestMode,
      reportError,
      sanitizeArtifacts,
      setResidueField,
    ],
  );

  const deleteArtifact = useCallback(
    async (artifactId: string) => {
      const findProjectId = Object.entries(artifactsByProject).find(([, list]) =>
        list.some((artifact) => artifact.id === artifactId),
      )?.[0];

      if (!findProjectId) {
        return false;
      }

      const removeFromState = () => {
        setArtifactsByProject((current) => {
          const list = current[findProjectId];
          if (!list) {
            return current;
          }
          const nextList = list.filter((artifact) => artifact.id !== artifactId);
          if (nextList.length === list.length) {
            return current;
          }
          return {
            ...current,
            [findProjectId]: nextList,
          };
        });
        artifactResidueStoreRef.current.delete(artifactId);
      };

      if (isGuestMode || !isDataApiConfigured) {
        removeFromState();
        return true;
      }

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('Missing authentication token.');
        }
        await deleteArtifactViaApi(token, artifactId);
        removeFromState();
        return true;
      } catch (error) {
        reportError(
          'Failed to delete artifact',
          error,
          'We could not delete the artifact. Please try again later.',
        );
        return false;
      }
    },
    [artifactsByProject, getIdToken, isGuestMode, reportError],
  );

  const updateProfile = useCallback(
    async (update: ProfileUpdate) => {
      let shouldPersist = false;
      let nextAchievements: string[] | undefined;
      let nextQuestlines: string[] | undefined;
      let nextSettings: UserSettings | undefined;

      setProfile((current) => {
        if (!current) {
          return current;
        }
        shouldPersist = true;
        nextAchievements = update.achievementsUnlocked
          ? Array.from(new Set([...current.achievementsUnlocked, ...update.achievementsUnlocked]))
          : current.achievementsUnlocked;
        nextQuestlines = update.questlinesClaimed
          ? Array.from(new Set([...current.questlinesClaimed, ...update.questlinesClaimed]))
          : current.questlinesClaimed;
        nextSettings = update.settings
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

      if (!shouldPersist) {
        return;
      }

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
        reportError(
          'Failed to persist profile update',
          error,
          'We could not save your profile changes. Please try again later.',
        );
      }
    },
    [getIdToken, isGuestMode, reportError],
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
        reportError(
          'Failed to persist XP changes',
          error,
          'We could not update your XP. Please refresh and try again.',
        );
      }
    },
    [getIdToken, isGuestMode, reportError],
  );

  const deleteAccountData = useCallback(async () => {
    if (!profile && !isGuestMode) {
      return false;
    }

    if (isGuestMode || !isDataApiConfigured) {
      clearWorkspaceState();
      return true;
    }

    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('Missing authentication token.');
      }
      await deleteAccountViaApi(token);
      clearWorkspaceState();
      return true;
    } catch (error) {
      reportError(
        'Failed to delete account data',
        error,
        'We could not delete your account data. Please try again later.',
        { suppressState: true },
      );
      return false;
    }
  }, [
    clearWorkspaceState,
    getIdToken,
    isGuestMode,
    profile,
    reportError,
  ]);

  const value = useMemo<UserDataContextValue>(
    () => ({
      projects,
      artifacts,
      profile,
      loading,
      error,
      clearError,
      canLoadMoreProjects: Boolean(projectPageToken),
      loadMoreProjects,
      ensureProjectArtifacts,
      canLoadMoreArtifacts,
      loadMoreArtifacts,
      createProject,
      updateProject,
      deleteProject,
      createArtifact,
      createArtifactsBulk,
      updateArtifact,
      deleteArtifact,
      mergeArtifacts,
      memoryConversations,
      updateMemorySuggestionStatus,
      updateProfile,
      addXp,
      deleteAccountData,
    }),
    [
      projects,
      artifacts,
      profile,
      loading,
      error,
      clearError,
      projectPageToken,
      loadMoreProjects,
      ensureProjectArtifacts,
      canLoadMoreArtifacts,
      loadMoreArtifacts,
      createProject,
      updateProject,
      deleteProject,
      createArtifact,
      createArtifactsBulk,
      updateArtifact,
      deleteArtifact,
      mergeArtifacts,
      memoryConversations,
      updateMemorySuggestionStatus,
      updateProfile,
      addXp,
      deleteAccountData,
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

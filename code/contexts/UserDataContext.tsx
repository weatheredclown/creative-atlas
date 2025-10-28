import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Artifact, Project, UserProfile, UserSettings } from '../types';
import { createSeedWorkspace } from '../seedData';
import { useAuth } from './AuthContext';

interface StoredWorkspace {
  projects: Project[];
  artifacts: Artifact[];
  profile: UserProfile;
}

const STORAGE_PREFIX = 'creative-atlas:workspace:';

const defaultSettings: UserSettings = {
  theme: 'system',
  aiTipsEnabled: true,
};

type ProfileUpdate = Partial<Omit<UserProfile, 'settings'>> & { settings?: Partial<UserSettings> };

interface UserDataContextValue {
  projects: Project[];
  setProjects: (updater: React.SetStateAction<Project[]>) => void;
  artifacts: Artifact[];
  setArtifacts: (updater: React.SetStateAction<Artifact[]>) => void;
  profile: UserProfile | null;
  updateProfile: (update: ProfileUpdate) => void;
  addXp: (amount: number) => void;
  loading: boolean;
}

const UserDataContext = createContext<UserDataContextValue | undefined>(undefined);

const isStorageAvailable = (): boolean => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    const testKey = '__creative_atlas_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.warn('LocalStorage unavailable, workspace will not persist across sessions.', error);
    return false;
  }
};

const storageAvailable = isStorageAvailable();

const getStorageKey = (uid: string) => `${STORAGE_PREFIX}${uid}`;

const createDefaultProfile = (uid: string, email: string | null, displayName: string | null, photoURL: string | null, xp: number): UserProfile => ({
  uid,
  email: email ?? '',
  displayName: displayName ?? email?.split('@')[0] ?? 'Creator',
  photoURL: photoURL ?? undefined,
  xp,
  achievementsUnlocked: [],
  settings: { ...defaultSettings },
});

const normalizeProjects = (projects: Project[], ownerId: string): Project[] =>
  projects.map((project) => ({ ...project, ownerId }));

const normalizeArtifacts = (artifacts: Artifact[], ownerId: string): Artifact[] =>
  artifacts.map((artifact) => ({ ...artifact, ownerId }));

const readWorkspace = (uid: string, email: string | null, displayName: string | null, photoURL: string | null): StoredWorkspace => {
  if (storageAvailable) {
    try {
      const raw = window.localStorage.getItem(getStorageKey(uid));
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoredWorkspace>;
        const profile = parsed.profile ?? createDefaultProfile(uid, email, displayName, photoURL, 0);
        return {
          projects: normalizeProjects(parsed.projects ?? [], uid),
          artifacts: normalizeArtifacts(parsed.artifacts ?? [], uid),
          profile: {
            ...createDefaultProfile(uid, email, displayName, photoURL, profile.xp ?? 0),
            achievementsUnlocked: Array.isArray(profile.achievementsUnlocked) ? profile.achievementsUnlocked : [],
            settings: {
              ...defaultSettings,
              ...(profile.settings ?? {}),
            },
          },
        };
      }
    } catch (error) {
      console.warn('Failed to read workspace from storage, falling back to seed data.', error);
    }
  }

  const seed = createSeedWorkspace(uid);
  return {
    projects: normalizeProjects(seed.projects, uid),
    artifacts: normalizeArtifacts(seed.artifacts, uid),
    profile: createDefaultProfile(uid, email, displayName, photoURL, seed.xp),
  };
};

const writeWorkspace = (uid: string, workspace: StoredWorkspace) => {
  if (!storageAvailable) return;
  try {
    window.localStorage.setItem(getStorageKey(uid), JSON.stringify(workspace));
  } catch (error) {
    console.error('Failed to persist workspace to storage.', error);
  }
};

export const UserDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [projects, setProjectsState] = useState<Project[]>([]);
  const [artifacts, setArtifactsState] = useState<Artifact[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!user) {
      setProjectsState([]);
      setArtifactsState([]);
      setProfile(null);
      setHydrated(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const workspace = readWorkspace(user.uid, user.email, user.displayName, user.photoURL);
    setProjectsState(workspace.projects);
    setArtifactsState(workspace.artifacts);
    setProfile(workspace.profile);
    setHydrated(true);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user || !profile) {
      return;
    }

    const updates: ProfileUpdate = {};
    if (user.displayName && user.displayName !== profile.displayName) {
      updates.displayName = user.displayName;
    }
    if (user.photoURL && user.photoURL !== profile.photoURL) {
      updates.photoURL = user.photoURL;
    }
    if (user.email && user.email !== profile.email) {
      updates.email = user.email;
    }

    if (Object.keys(updates).length > 0) {
      setProfile((current) => (current ? { ...current, ...updates } : current));
    }
  }, [user?.displayName, user?.photoURL, user?.email]);

  useEffect(() => {
    if (!user || !hydrated || !profile) return;
    writeWorkspace(user.uid, { projects, artifacts, profile });
  }, [user, hydrated, projects, artifacts, profile]);

  const setProjects = useCallback((updater: React.SetStateAction<Project[]>) => {
    if (!user) return;
    setProjectsState((current) => {
      const next = typeof updater === 'function' ? (updater as (value: Project[]) => Project[])(current) : updater;
      return normalizeProjects(next, user.uid);
    });
  }, [user]);

  const setArtifacts = useCallback((updater: React.SetStateAction<Artifact[]>) => {
    if (!user) return;
    setArtifactsState((current) => {
      const next = typeof updater === 'function' ? (updater as (value: Artifact[]) => Artifact[])(current) : updater;
      return normalizeArtifacts(next, user.uid);
    });
  }, [user]);

  const updateProfile = useCallback((update: ProfileUpdate) => {
    setProfile((current) => {
      if (!current) return current;
      const nextSettings = update.settings ? { ...current.settings, ...update.settings } : current.settings;
      const nextAchievements = update.achievementsUnlocked
        ? Array.from(new Set([...current.achievementsUnlocked, ...update.achievementsUnlocked]))
        : current.achievementsUnlocked;
      const { settings, achievementsUnlocked, ...rest } = update;
      return {
        ...current,
        ...rest,
        achievementsUnlocked: nextAchievements,
        settings: nextSettings,
      };
    });
  }, []);

  const addXp = useCallback((amount: number) => {
    if (amount === 0) return;
    setProfile((current) => {
      if (!current) return current;
      const nextXp = Math.max(0, current.xp + amount);
      return { ...current, xp: nextXp };
    });
  }, []);

  const value = useMemo<UserDataContextValue>(() => ({
    projects,
    setProjects,
    artifacts,
    setArtifacts,
    profile,
    updateProfile,
    addXp,
    loading,
  }), [projects, setProjects, artifacts, setArtifacts, profile, updateProfile, addXp, loading]);

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
};

export const useUserData = (): UserDataContextValue => {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
};


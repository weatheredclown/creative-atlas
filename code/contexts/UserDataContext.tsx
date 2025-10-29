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
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { Artifact, Project, ProjectStatus, UserProfile, UserSettings } from '../types';
import { createSeedWorkspace } from '../seedData';
import { advanceStreak, formatDateKey } from '../utils/streak';
import { useAuth } from './AuthContext';
import { firebaseApp } from '../services/firebaseApp';

type ProfileUpdate = Partial<Omit<UserProfile, 'settings'>> & { settings?: Partial<UserSettings> };

interface UserDataContextValue {
  projects: Project[];
  setProjects: (updater: React.SetStateAction<Project[]>) => void;
  artifacts: Artifact[];
  addArtifact: (artifact: Artifact) => void;
  addArtifacts: (artifacts: Artifact[]) => void;
  updateArtifact: (artifactId: string, updater: (artifact: Artifact) => Artifact) => void;
  profile: UserProfile | null;
  updateProfile: (update: ProfileUpdate) => void;
  addXp: (amount: number) => void;
  loading: boolean;
}

const UserDataContext = createContext<UserDataContextValue | undefined>(undefined);

const defaultSettings: UserSettings = {
  theme: 'system',
  aiTipsEnabled: true,
};

const db = getFirestore(firebaseApp);

const sanitizeForFirestore = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const areProjectsEqual = (a: Project, b: Project): boolean =>
  a.id === b.id &&
  a.ownerId === b.ownerId &&
  a.title === b.title &&
  a.summary === b.summary &&
  a.status === b.status &&
  a.tags.length === b.tags.length &&
  a.tags.every((tag, index) => tag === b.tags[index]);

const areArtifactsEqual = (a: Artifact, b: Artifact): boolean => JSON.stringify(a) === JSON.stringify(b);

const createDefaultProfile = (
  uid: string,
  email: string | null,
  displayName: string | null,
  photoURL: string | null,
  xp: number,
): UserProfile => {
  const todayKey = formatDateKey(new Date());
  const hasXp = xp > 0;
  return {
    uid,
    email: email ?? '',
    displayName: displayName ?? email?.split('@')[0] ?? 'Creator',
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

const loadWorkspace = async (
  uid: string,
  email: string | null,
  displayName: string | null,
  photoURL: string | null,
) => {
  const profileRef = doc(db, 'users', uid);
  const profileSnap = await getDoc(profileRef);

  let profile: UserProfile;
  if (profileSnap.exists()) {
    const raw = profileSnap.data() as Partial<UserProfile>;
    const base = createDefaultProfile(uid, email, displayName, photoURL, typeof raw.xp === 'number' ? raw.xp : 0);
    profile = {
      ...base,
      ...raw,
      email: typeof raw.email === 'string' ? raw.email : base.email,
      displayName: typeof raw.displayName === 'string' ? raw.displayName : base.displayName,
      photoURL: raw.photoURL ?? base.photoURL,
      achievementsUnlocked: Array.isArray(raw.achievementsUnlocked)
        ? raw.achievementsUnlocked
        : base.achievementsUnlocked,
      questlinesClaimed: Array.isArray(raw.questlinesClaimed)
        ? raw.questlinesClaimed
        : base.questlinesClaimed,
      settings: {
        ...base.settings,
        ...(raw.settings ?? {}),
      },
    };
  } else {
    profile = createDefaultProfile(uid, email, displayName, photoURL, 0);
    await updateDoc(profileRef, {
      ...sanitizeForFirestore(profile),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).catch(async () => {
      // updateDoc will fail if the document does not exist; fall back to set via runTransaction
      await runTransaction(db, async (transaction) => {
        transaction.set(profileRef, {
          ...sanitizeForFirestore(profile),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
    });
  }

  const projectsQuery = query(collection(db, 'projects'), where('ownerId', '==', uid));
  const projectsSnapshot = await getDocs(projectsQuery);
  const projects: Project[] = projectsSnapshot.docs.map((projectDoc) => {
    const data = projectDoc.data();
    return {
      id: projectDoc.id,
      ownerId: data.ownerId ?? uid,
      title: typeof data.title === 'string' ? data.title : 'Untitled Project',
      summary: typeof data.summary === 'string' ? data.summary : '',
      status: (data.status as ProjectStatus) ?? ProjectStatus.Active,
      tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    };
  });

  const artifactsQuery = query(collection(db, 'artifacts'), where('ownerId', '==', uid));
  const artifactsSnapshot = await getDocs(artifactsQuery);
  const artifacts: Artifact[] = artifactsSnapshot.docs.map((artifactDoc) => {
    const data = artifactDoc.data();
    return {
      id: artifactDoc.id,
      ownerId: data.ownerId ?? uid,
      projectId: typeof data.projectId === 'string' ? data.projectId : '',
      type: data.type,
      title: typeof data.title === 'string' ? data.title : 'Untitled Artifact',
      summary: typeof data.summary === 'string' ? data.summary : '',
      status: typeof data.status === 'string' ? data.status : 'idea',
      tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
      relations: Array.isArray(data.relations) ? (data.relations as Artifact['relations']) : [],
      data: data.data ?? {},
    };
  });

  return {
    projects: normalizeProjects(projects, uid),
    artifacts: normalizeArtifacts(artifacts, uid),
    profile,
  };
};

const persistProjectsDiff = async (previous: Project[], next: Project[]) => {
  const batch = writeBatch(db);
  const previousMap = new Map(previous.map((project) => [project.id, project]));
  const nextMap = new Map(next.map((project) => [project.id, project]));
  let hasChanges = false;

  nextMap.forEach((project) => {
    const existing = previousMap.get(project.id);
    const ref = doc(db, 'projects', project.id);
    if (!existing) {
      batch.set(ref, {
        ...sanitizeForFirestore(project),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      hasChanges = true;
      return;
    }

    if (!areProjectsEqual(existing, project)) {
      const rest = { ...project };
      delete rest.id;
      batch.set(ref, {
        ...sanitizeForFirestore(rest),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      hasChanges = true;
    }
  });

  previousMap.forEach((_project, id) => {
    if (!nextMap.has(id)) {
      batch.delete(doc(db, 'projects', id));
      hasChanges = true;
    }
  });

  if (hasChanges) {
    await batch.commit();
  }
};

const persistArtifactsDiff = async (previous: Artifact[], next: Artifact[]) => {
  const batch = writeBatch(db);
  const previousMap = new Map(previous.map((artifact) => [artifact.id, artifact]));
  const nextMap = new Map(next.map((artifact) => [artifact.id, artifact]));
  let hasChanges = false;

  nextMap.forEach((artifact) => {
    const existing = previousMap.get(artifact.id);
    const ref = doc(db, 'artifacts', artifact.id);
    if (!existing) {
      batch.set(ref, {
        ...sanitizeForFirestore(artifact),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      hasChanges = true;
      return;
    }

    if (!areArtifactsEqual(existing, artifact)) {
      const rest = { ...artifact };
      delete rest.id;
      batch.set(ref, {
        ...sanitizeForFirestore(rest),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      hasChanges = true;
    }
  });

  previousMap.forEach((_artifact, id) => {
    if (!nextMap.has(id)) {
      batch.delete(doc(db, 'artifacts', id));
      hasChanges = true;
    }
  });

  if (hasChanges) {
    await batch.commit();
  }
};

const persistProfileUpdate = async (uid: string, update: ProfileUpdate & { achievementsUnlocked?: string[]; questlinesClaimed?: string[] }) => {
  const ref = doc(db, 'users', uid);
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };

  const { settings, ...rest } = update;
  Object.assign(payload, sanitizeForFirestore(rest));

  if (settings) {
    Object.entries(settings).forEach(([key, value]) => {
      payload[`settings.${key}`] = value;
    });
  }

  await updateDoc(ref, payload);
};

export const UserDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isGuestMode } = useAuth();
  const [projects, setProjectsState] = useState<Project[]>([]);
  const [artifacts, setArtifactsState] = useState<Artifact[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const projectsRef = useRef<Project[]>([]);
  const artifactsRef = useRef<Artifact[]>([]);

  const applyProjectsState = useCallback((next: Project[]) => {
    projectsRef.current = next;
    setProjectsState(next);
  }, []);

  const applyArtifactsState = useCallback((next: Artifact[]) => {
    artifactsRef.current = next;
    setArtifactsState(next);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (isGuestMode) {
      setLoading(true);
      const guestId = 'guest';
      const seed = createSeedWorkspace(guestId);
      applyProjectsState(normalizeProjects(seed.projects, guestId));
      applyArtifactsState(normalizeArtifacts(seed.artifacts, guestId));
      setProfile(createDefaultProfile(guestId, null, 'Guest Creator', null, seed.xp));
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    if (!user) {
      applyProjectsState([]);
      applyArtifactsState([]);
      setProfile(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);

    loadWorkspace(user.uid, user.email, user.displayName, user.photoURL)
      .then(({ projects: loadedProjects, artifacts: loadedArtifacts, profile: loadedProfile }) => {
        if (cancelled) {
          return;
        }
        applyProjectsState(loadedProjects);
        applyArtifactsState(loadedArtifacts);
        setProfile(loadedProfile);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load workspace from Firestore', error);
        if (!cancelled) {
          applyProjectsState([]);
          applyArtifactsState([]);
          setProfile(createDefaultProfile(user.uid, user.email, user.displayName, user.photoURL, 0));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, isGuestMode, applyProjectsState, applyArtifactsState]);

  const setProjects = useCallback(
    (updater: React.SetStateAction<Project[]>) => {
      setProjectsState(() => {
        const next =
          typeof updater === 'function'
            ? (updater as (value: Project[]) => Project[])(projectsRef.current)
            : updater;

        if (!Array.isArray(next)) {
          console.warn('setProjects updater must return an array of projects.');
          return projectsRef.current;
        }

        const previous = projectsRef.current;
        const unchanged =
          previous.length === next.length && previous.every((project, index) => areProjectsEqual(project, next[index]));

        if (!unchanged) {
          projectsRef.current = next;

          if (user && !isGuestMode) {
            void persistProjectsDiff(previous, next).catch((error) => {
              console.error('Failed to persist project changes', error);
            });
          }

          return next;
        }

        return previous;
      });
    },
    [isGuestMode, user],
  );

  const setArtifacts = useCallback(
    (updater: React.SetStateAction<Artifact[]>) => {
      setArtifactsState(() => {
        const next =
          typeof updater === 'function'
            ? (updater as (value: Artifact[]) => Artifact[])(artifactsRef.current)
            : updater;

        if (!Array.isArray(next)) {
          console.warn('setArtifacts updater must return an array of artifacts.');
          return artifactsRef.current;
        }

        const previous = artifactsRef.current;
        const unchanged =
          previous.length === next.length && previous.every((artifact, index) => areArtifactsEqual(artifact, next[index]));

        if (!unchanged) {
          artifactsRef.current = next;

          if (user && !isGuestMode) {
            void persistArtifactsDiff(previous, next).catch((error) => {
              console.error('Failed to persist artifact changes', error);
            });
          }

          return next;
        }

        return previous;
      });
    },
    [isGuestMode, user],
  );

  const addArtifact = useCallback(
    (artifact: Artifact) => {
      setArtifacts((current) => {
        const index = current.findIndex((item) => item.id === artifact.id);
        if (index === -1) {
          return [...current, artifact];
        }

        if (areArtifactsEqual(current[index], artifact)) {
          return current;
        }

        const next = [...current];
        next[index] = artifact;
        return next;
      });
    },
    [setArtifacts],
  );

  const addArtifacts = useCallback(
    (artifactsToAdd: Artifact[]) => {
      if (artifactsToAdd.length === 0) {
        return;
      }

      setArtifacts((current) => {
        let changed = false;
        const next = [...current];
        const indexById = new Map(current.map((artifact, index) => [artifact.id, index]));

        artifactsToAdd.forEach((artifact) => {
          const existingIndex = indexById.get(artifact.id);
          if (typeof existingIndex === 'number') {
            if (!areArtifactsEqual(next[existingIndex], artifact)) {
              next[existingIndex] = artifact;
              changed = true;
            }
            return;
          }

          next.push(artifact);
          indexById.set(artifact.id, next.length - 1);
          changed = true;
        });

        return changed ? next : current;
      });
    },
    [setArtifacts],
  );

  const updateArtifact = useCallback(
    (artifactId: string, updater: (artifact: Artifact) => Artifact) => {
      setArtifacts((current) => {
        let changed = false;

        const next = current.map((artifact) => {
          if (artifact.id !== artifactId) {
            return artifact;
          }

          const updated = updater(artifact);
          if (!updated) {
            return artifact;
          }

          if (areArtifactsEqual(artifact, updated)) {
            return artifact;
          }

          changed = true;
          return updated;
        });

        return changed ? next : current;
      });
    },
    [setArtifacts],
  );

  const updateProfile = useCallback(
    (update: ProfileUpdate) => {
      setProfile((current) => {
        if (!current) return current;

        const {
          settings: partialSettings,
          achievementsUnlocked: unlockedIds,
          questlinesClaimed: claimedQuestlines,
          ...rest
        } = update;

        const nextSettings = partialSettings ? { ...current.settings, ...partialSettings } : current.settings;
        const nextAchievements = unlockedIds
          ? Array.from(new Set([...current.achievementsUnlocked, ...unlockedIds]))
          : current.achievementsUnlocked;
        const nextQuestlinesClaimed = claimedQuestlines
          ? Array.from(new Set([...current.questlinesClaimed, ...claimedQuestlines]))
          : current.questlinesClaimed;

        const nextProfile: UserProfile = {
          ...current,
          ...rest,
          achievementsUnlocked: nextAchievements,
          questlinesClaimed: nextQuestlinesClaimed,
          settings: nextSettings,
        };

        if (user && !isGuestMode) {
          void persistProfileUpdate(user.uid, {
            ...rest,
            achievementsUnlocked: nextAchievements,
            questlinesClaimed: nextQuestlinesClaimed,
            settings: nextSettings,
          }).catch((error) => {
            console.error('Failed to persist profile changes', error);
          });
        }

        return nextProfile;
      });
    },
    [isGuestMode, user],
  );

  const addXp = useCallback(
    (amount: number) => {
      if (amount === 0) return;

      setProfile((current) => {
        if (!current) return current;
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

      if (user && !isGuestMode) {
        void runTransaction(db, async (transaction) => {
          const profileRef = doc(db, 'users', user.uid);
          const snapshot = await transaction.get(profileRef);
          const raw = snapshot.exists() ? (snapshot.data() as Partial<UserProfile>) : {};
          const base = createDefaultProfile(user.uid, user.email, user.displayName, user.photoURL, typeof raw.xp === 'number' ? raw.xp : 0);
          const currentProfile: UserProfile = {
            ...base,
            ...raw,
            achievementsUnlocked: Array.isArray(raw.achievementsUnlocked)
              ? raw.achievementsUnlocked
              : base.achievementsUnlocked,
            questlinesClaimed: Array.isArray(raw.questlinesClaimed)
              ? raw.questlinesClaimed
              : base.questlinesClaimed,
            settings: {
              ...base.settings,
              ...(raw.settings ?? {}),
            },
          };

          const nextXp = Math.max(0, currentProfile.xp + amount);
          let payload: Record<string, unknown> = {
            xp: nextXp,
            updatedAt: serverTimestamp(),
          };

          if (amount > 0) {
            const todayKey = formatDateKey(new Date());
            const nextStreak = advanceStreak(
              {
                streakCount: currentProfile.streakCount,
                bestStreak: currentProfile.bestStreak,
                lastActiveDate: currentProfile.lastActiveDate,
              },
              todayKey,
            );
            payload = {
              ...payload,
              streakCount: nextStreak.streakCount,
              bestStreak: nextStreak.bestStreak,
              lastActiveDate: nextStreak.lastActiveDate,
            };
          }

          transaction.set(profileRef, payload, { merge: true });
        }).catch((error) => {
          console.error('Failed to persist XP changes', error);
        });
      }
    },
    [isGuestMode, user],
  );

  const value = useMemo<UserDataContextValue>(
    () => ({
      projects,
      setProjects,
      artifacts,
      addArtifact,
      addArtifacts,
      updateArtifact,
      profile,
      updateProfile,
      addXp,
      loading,
    }),
    [projects, setProjects, artifacts, addArtifact, addArtifacts, updateArtifact, profile, updateProfile, addXp, loading],
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

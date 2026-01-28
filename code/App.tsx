import { useState, useMemo, useCallback, useEffect, useRef, type FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Artifact,
  Project,
  ProjectStatus,
  TemplateArtifactBlueprint,
  UserProfile,
  type MemorySyncStatus,
  type ProjectComponentKey,
  type ProjectVisibilitySettings,
} from './types';
import { CubeIcon, SparklesIcon } from './components/Icons';
import Header from './components/Header';
import Modal from './components/Modal';
import CreateProjectForm from './components/CreateProjectForm';
import { useUserData } from './contexts/UserDataContext';
import { useAuth } from './contexts/AuthContext';
import { useToast } from './contexts/ToastContext';
import { achievements } from './src/data/achievements';
import { milestoneRoadmap } from './src/data/milestones';
import { getCurrentDateKey, questlines, selectDailyQuestsForDate } from './src/data/quests';
import { isDataApiConfigured } from './services/dataApi';
import ErrorBanner from './components/ErrorBanner';
import TutorialGuide from './components/TutorialGuide';
import ErrorBoundary from './components/ErrorBoundary';
import { createProjectActivity, evaluateMilestoneProgress, MilestoneProgressOverview, ProjectActivity } from './utils/milestoneProgress';
import PublishToGitHubModal from './components/PublishToGitHubModal';
import { DepthPreferencesProvider } from './contexts/DepthPreferencesContext';
import { TutorialLanguageProvider } from './contexts/TutorialLanguageContext';
import {
  createDefaultVisibility,
  ensureVisibilityDefaults,
  loadProjectVisibility,
  persistProjectVisibility,
} from './utils/projectVisibility';
import {
  loadProjectPublishHistory,
  persistProjectPublishHistory,
  type ProjectPublishRecord,
} from './utils/publishHistory';
import ProjectWorkspace from './components/workspace/ProjectWorkspace';
import WorkspaceSidebar from './components/WorkspaceSidebar';
import { getDefaultDataForType } from './utils/artifactDefaults';
import { useGitHubPublish } from './hooks/useGitHubPublish';
import { loadTutorialProgress, persistTutorialProgress, TutorialProgressState } from './utils/tutorialStorage';
import { clearAnalyticsUser, setAnalyticsUser } from './services/analytics';
import GhostAgent, { GhostAgentHandle } from './components/GhostAgent';
import ProfileDrawer from './components/ProfileDrawer';
import type { ArtifactNavigationController } from './components/workspace/types';
import WorkspaceWelcome from './components/WorkspaceWelcome';

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  [ProjectStatus.Idea]: 'Idea',
  [ProjectStatus.Active]: 'Active',
  [ProjectStatus.Paused]: 'Paused',
  [ProjectStatus.Archived]: 'Archived',
};

const PROJECT_SEARCH_PARAM = 'projectSearch';
const PROJECT_STATUS_PARAM = 'projectStatus';

const formatProjectStatusLabel = (status: ProjectStatus): string =>
  PROJECT_STATUS_LABELS[status] ?? status;

const truncateForContext = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
};

const parseProjectStatusFilter = (value: string | null): 'ALL' | ProjectStatus => {
  if (!value || value === 'ALL') {
    return 'ALL';
  }

  return Object.values(ProjectStatus).includes(value as ProjectStatus) ? (value as ProjectStatus) : 'ALL';
};

const DashboardShellPlaceholder: FC<{ loading: boolean }> = ({ loading }) => (
  <div className="min-h-screen flex flex-col bg-slate-950">
    <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800/70 px-4 sm:px-8 py-3">
      <div className="flex items-center gap-3">
        <CubeIcon className="w-7 h-7 text-cyan-400" />
        <h1 className="text-xl font-bold text-slate-100">Creative Atlas</h1>
      </div>
    </header>
    <main id="main-content" className="flex flex-1 items-center justify-center p-8">
      <div className="text-center space-y-4" aria-live="polite">
        <div className="flex items-center justify-center">
          <div
            aria-hidden="true"
            className="h-12 w-12 animate-spin rounded-full border-2 border-cyan-400/60 border-t-transparent"
          ></div>
        </div>
        <p className="text-sm text-slate-300">
          {loading
            ? 'Preparing your Creative Atlas workspace…'
            : 'Your workspace is almost ready. If this message persists, please refresh the page.'}
        </p>
      </div>
    </main>
  </div>
);

export default function App() {
  const {
    projects,
    artifacts,
    profile,
    loading,
    error,
    clearError,
    memoryConversations,
    npcMemoryRuns,
    updateMemorySuggestionStatus,
    addXp,
    updateProfile,
    ensureProjectArtifacts,
    createProject,
    updateProject,
    deleteProject,
    createArtifact,
    createArtifactsBulk,
    updateArtifact,
    deleteArtifact,
    mergeArtifacts,
    canLoadMoreProjects,
    loadMoreProjects,
  } = useUserData();
  const { signOutUser, getIdToken, isGuestMode } = useAuth();
  const { showToast } = useToast();
  const ghostAgentRef = useRef<GhostAgentHandle>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get('projectId');
  const initialProjectSearch = searchParams.get(PROJECT_SEARCH_PARAM) ?? '';
  const initialProjectStatus = parseProjectStatusFilter(searchParams.get(PROJECT_STATUS_PARAM));
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [projectSearchTerm, setProjectSearchTerm] = useState(initialProjectSearch);
  const [projectStatusFilter, setProjectStatusFilter] = useState<'ALL' | ProjectStatus>(initialProjectStatus);
  const [dailyQuestDayKey, setDailyQuestDayKey] = useState<string>(() => getCurrentDateKey());
  const [projectActivityLog, setProjectActivityLog] = useState<Record<string, ProjectActivity>>({});
  const [projectVisibilityMap, setProjectVisibilityMap] = useState<Record<string, ProjectVisibilitySettings>>(
    () => loadProjectVisibility(),
  );
  const [projectPublishHistory, setProjectPublishHistory] = useState<Record<string, ProjectPublishRecord>>(
    () => loadProjectPublishHistory(),
  );
  const [isLoadingMoreProjects, setIsLoadingMoreProjects] = useState(false);
  const [tutorialProgress, setTutorialProgress] = useState<TutorialProgressState>(() => loadTutorialProgress());
  const [isTutorialVisible, setIsTutorialVisible] = useState(() => {
    const progress = loadTutorialProgress();
    return !progress.hasCompleted && !progress.wasDismissed;
  });
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [artifactNavigator, setArtifactNavigator] = useState<ArtifactNavigationController | null>(null);
  const [isZenMode, setIsZenMode] = useState(false);
  const dataApiEnabled = isDataApiConfigured && !isGuestMode;
  const selectedProject = useMemo(
    () => (projectIdFromUrl ? projects.find((project) => project.id === projectIdFromUrl) ?? null : null),
    [projects, projectIdFromUrl],
  );
  const selectedProjectId = selectedProject?.id ?? null;

  useEffect(() => {
    if (!profile) {
      void clearAnalyticsUser();
      return;
    }

    void setAnalyticsUser(profile.uid, {
      tutorial_language: tutorialProgress.language,
    });
  }, [profile, tutorialProgress.language]);

  useEffect(() => {
    const nextSearch = searchParams.get(PROJECT_SEARCH_PARAM) ?? '';
    if (nextSearch !== projectSearchTerm) {
      setProjectSearchTerm(nextSearch);
    }

    const nextStatus = parseProjectStatusFilter(searchParams.get(PROJECT_STATUS_PARAM));
    if (nextStatus !== projectStatusFilter) {
      setProjectStatusFilter(nextStatus);
    }
  }, [projectSearchTerm, projectStatusFilter, searchParams]);

  useEffect(() => {
    const currentSearch = searchParams.get(PROJECT_SEARCH_PARAM) ?? '';
    const currentStatus = parseProjectStatusFilter(searchParams.get(PROJECT_STATUS_PARAM));
    const trimmedSearch = projectSearchTerm.trim();

    if (currentSearch === trimmedSearch && currentStatus === projectStatusFilter) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    if (trimmedSearch) {
      nextParams.set(PROJECT_SEARCH_PARAM, trimmedSearch);
    } else {
      nextParams.delete(PROJECT_SEARCH_PARAM);
    }

    if (projectStatusFilter === 'ALL') {
      nextParams.delete(PROJECT_STATUS_PARAM);
    } else {
      nextParams.set(PROJECT_STATUS_PARAM, projectStatusFilter);
    }

    setSearchParams(nextParams, { replace: true });
  }, [projectSearchTerm, projectStatusFilter, searchParams, setSearchParams]);
  const projectArtifacts = useMemo(
    () => artifacts.filter((artifact) => artifact.projectId === selectedProjectId),
    [artifacts, selectedProjectId],
  );
  const ghostAgentProjectContext = useMemo(() => {
    if (!selectedProject) {
      return null;
    }

    const lines: string[] = [];
    const title = selectedProject.title.trim();
    const statusLabel = formatProjectStatusLabel(selectedProject.status);
    lines.push(`Project "${title}" (status: ${statusLabel}).`);

    const summary = selectedProject.summary.trim();
    if (summary.length > 0) {
      lines.push(`Summary: ${truncateForContext(summary, 400)}`);
    }

    const projectTags = selectedProject.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0);
    if (projectTags.length > 0) {
      lines.push(`Tags: ${projectTags.join(', ')}`);
    }

    if (projectArtifacts.length === 0) {
      lines.push('This project does not have any artifacts yet.');
      return lines.join('\n');
    }

    const artifactCounts = new Map<string, number>();
    projectArtifacts.forEach((artifact) => {
      const current = artifactCounts.get(artifact.type) ?? 0;
      artifactCounts.set(artifact.type, current + 1);
    });

    const sortedCounts = Array.from(artifactCounts.entries()).sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }

      return a[0].localeCompare(b[0]);
    });

    const highlightedCounts = sortedCounts.slice(0, 6);
    const hasAdditionalCounts = sortedCounts.length > highlightedCounts.length;
    const countsLabel = highlightedCounts.map(([type, count]) => `${type}: ${count}`).join(', ');
    lines.push(
      `Artifacts (${projectArtifacts.length} total): ${countsLabel}${hasAdditionalCounts ? ', …' : ''}`,
    );

    const artifactHighlights = projectArtifacts
      .filter((artifact) => artifact.summary.trim().length > 0)
      .sort((a, b) => a.title.localeCompare(b.title))
      .slice(0, 3);

    if (artifactHighlights.length > 0) {
      lines.push('Artifact highlights:');
      artifactHighlights.forEach((artifact) => {
        const cleanSummary = truncateForContext(artifact.summary.trim(), 220);
        lines.push(`- [${artifact.type}] ${artifact.title.trim()}: ${cleanSummary}`);
      });
    }

    return lines.join('\n');
  }, [projectArtifacts, selectedProject]);
  const projectNpcRuns = useMemo(
    () =>
      npcMemoryRuns.filter((run) =>
        selectedProjectId ? run.projectId === selectedProjectId : false,
      ),
    [npcMemoryRuns, selectedProjectId],
  );
  const githubAuthSuccessMessage =
    'GitHub authorization complete. Select a repository to publish your site.';
  const {
    isModalOpen: isPublishModalOpen,
    authStatus: githubAuthStatus,
    statusMessage: githubAuthMessage,
    isPublishing,
    error: publishError,
    success: publishSuccess,
    closeModal: closePublishModal,
    resetStatus: resetPublishStatus,
    startAuthorization: startGitHubAuthorization,
    publishToRepository,
  } = useGitHubPublish({
    getIdToken,
    selectedProject,
    projectArtifacts,
    setProjectPublishHistory,
    githubAuthSuccessMessage,
    isGuestMode,
  });
  const canUseDataApi = dataApiEnabled;
  const canPublishToGitHub = dataApiEnabled;
  
  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const delay = Math.max(tomorrow.getTime() - now.getTime(), 0);
    const timeout = window.setTimeout(() => {
      setDailyQuestDayKey(getCurrentDateKey());
    }, delay);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [dailyQuestDayKey]);

  useEffect(() => {
    persistProjectVisibility(projectVisibilityMap);
  }, [projectVisibilityMap]);

  useEffect(() => {
    persistProjectPublishHistory(projectPublishHistory);
  }, [projectPublishHistory]);

  useEffect(() => {
    persistTutorialProgress(tutorialProgress);
  }, [tutorialProgress]);

  const todaysDailyQuests = useMemo(
    () => selectDailyQuestsForDate(dailyQuestDayKey),
    [dailyQuestDayKey],
  );

  const handleToggleGhostAgent = useCallback(() => {
    ghostAgentRef.current?.toggle();
  }, []);

  const handleOpenProfileDrawer = useCallback(() => {
    setIsProfileDrawerOpen(true);
  }, []);

  const handleCloseProfileDrawer = useCallback(() => {
    setIsProfileDrawerOpen(false);
  }, []);

  const projectConversations = useMemo(
    () =>
      selectedProjectId
        ? memoryConversations.filter((conversation) => conversation.projectId === selectedProjectId)
        : [],
    [memoryConversations, selectedProjectId],
  );

  const isAutoLoadingProjectsRef = useRef(false);

  const handleMemoryStatusChange = useCallback(
    (conversationId: string, suggestionId: string, status: MemorySyncStatus) => {
      updateMemorySuggestionStatus(conversationId, suggestionId, status);
      if (status === 'approved') {
        void addXp(5);
      }
    },
    [addXp, updateMemorySuggestionStatus],
  );

  useEffect(() => {
    if (!projectIdFromUrl) {
      return;
    }

    if (projects.some((project) => project.id === projectIdFromUrl)) {
      return;
    }

    if (!canLoadMoreProjects || isAutoLoadingProjectsRef.current) {
      return;
    }

    isAutoLoadingProjectsRef.current = true;
    setIsLoadingMoreProjects(true);

    void (async () => {
      try {
        await loadMoreProjects();
      } catch (error) {
        console.error('Failed to auto-load more projects for URL selection', error);
      } finally {
        isAutoLoadingProjectsRef.current = false;
        setIsLoadingMoreProjects(false);
      }
    })();
  }, [canLoadMoreProjects, loadMoreProjects, projectIdFromUrl, projects]);

  useEffect(() => {
    if (!projectIdFromUrl) {
      return;
    }

    if (projects.some((project) => project.id === projectIdFromUrl)) {
      return;
    }

    if (isLoadingMoreProjects || canLoadMoreProjects) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('projectId');
    setSearchParams(nextParams, { replace: true });
  }, [canLoadMoreProjects, isLoadingMoreProjects, projectIdFromUrl, projects, searchParams, setSearchParams]);

  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }

    setProjectActivityLog((prev) => {
      if (prev[selectedProjectId]) {
        return prev;
      }
      return {
        ...prev,
        [selectedProjectId]: createProjectActivity(),
      };
    });
  }, [selectedProjectId]);
  

  const updateProjectActivity = useCallback((projectId: string, updates: Partial<ProjectActivity>) => {
    setProjectActivityLog((prev) => {
      const current = prev[projectId] ?? createProjectActivity();
      let changed = false;
      const next: ProjectActivity = { ...current };

      (Object.entries(updates) as [keyof ProjectActivity, boolean][]).forEach(([key, value]) => {
        if (typeof value === 'undefined') {
          return;
        }
        if (next[key] !== value) {
          next[key] = value;
          changed = true;
        }
      });

      if (!changed && prev[projectId]) {
        return prev;
      }

      return {
        ...prev,
        [projectId]: changed ? next : current,
      };
    });
  }, []);

  const markSelectedProjectActivity = useCallback((updates: Partial<ProjectActivity>) => {
    if (!selectedProjectId) {
      return;
    }
    updateProjectActivity(selectedProjectId, updates);
  }, [selectedProjectId, updateProjectActivity]);

  useEffect(() => {
    if (!profile) return;
    const unlocked = achievements.filter(achievement => achievement.isUnlocked(artifacts, projects)).map(achievement => achievement.id);
    const missing = unlocked.filter(id => !profile.achievementsUnlocked.includes(id));
    if (missing.length > 0) {
      updateProfile({ achievementsUnlocked: unlocked });
    }
  }, [profile, artifacts, projects, updateProfile]);

  const visibleProjects = useMemo(() => {
    const normalizedQuery = projectSearchTerm.trim().toLowerCase();

    return projects.filter((project) => {
      if (projectStatusFilter !== 'ALL' && project.status !== projectStatusFilter) {
        return false;
      }

      if (normalizedQuery) {
        const haystack = `${project.title} ${project.summary} ${project.tags.join(' ')}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) {
          return false;
        }
      }

      return true;
    });
  }, [projects, projectStatusFilter, projectSearchTerm]);
  const hasProjectFilters = projectStatusFilter !== 'ALL' || projectSearchTerm.trim() !== '';
  const selectedProjectHiddenBySidebarFilters = Boolean(
    selectedProjectId && !visibleProjects.some((project) => project.id === selectedProjectId),
  );


  const currentProjectVisibility = useMemo(() => {
    if (!selectedProjectId) {
      return createDefaultVisibility();
    }

    return ensureVisibilityDefaults(projectVisibilityMap[selectedProjectId]);
  }, [selectedProjectId, projectVisibilityMap]);

  const handleToggleComponentVisibility = useCallback(
    (component: ProjectComponentKey, isVisible: boolean) => {
      if (!selectedProjectId) {
        return;
      }

      setProjectVisibilityMap((previous) => {
        const existing = ensureVisibilityDefaults(previous[selectedProjectId]);
        const updated: ProjectVisibilitySettings = { ...existing, [component]: isVisible };
        return { ...previous, [selectedProjectId]: updated };
      });
    },
    [selectedProjectId],
  );

  const handleResetComponentVisibility = useCallback(() => {
    if (!selectedProjectId) {
      return;
    }

    setProjectVisibilityMap((previous) => ({
      ...previous,
      [selectedProjectId]: createDefaultVisibility(),
    }));
  }, [selectedProjectId]);

  const handleSelectProject = useCallback(
    (id: string) => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('projectId', id);
      setSearchParams(nextParams);
    },
    [searchParams, setSearchParams],
  );

  const handleReturnToAtlas = useCallback(() => {
    setArtifactNavigator(null);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('projectId');
    nextParams.delete('workspaceView');
    nextParams.delete('artifactView');
    nextParams.delete('artifactType');
    nextParams.delete('artifactStatus');
    nextParams.delete('artifactSearch');
    nextParams.delete('artifactTags');
    nextParams.delete('artifactId');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }
    void ensureProjectArtifacts(selectedProjectId);
  }, [selectedProjectId, ensureProjectArtifacts]);

  const handleCreateProject = useCallback(
    async ({
      title,
      summary,
      tags,
      artifacts: starterArtifacts,
    }: {
      title: string;
      summary: string;
      tags?: string[];
      artifacts?: TemplateArtifactBlueprint[];
    }) => {
      if (!profile) return;
      const created = await createProject({ title, summary, tags });
      if (!created) {
        return;
      }
      void addXp(5);
      setIsCreateProjectModalOpen(false);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('projectId', created.id);
      setSearchParams(nextParams, { replace: true });
      setProjectStatusFilter('ALL');
      setProjectSearchTerm('');

      const normalizedStarters = (starterArtifacts ?? []).filter(
        (blueprint): blueprint is TemplateArtifactBlueprint =>
          !!blueprint &&
          typeof blueprint.title === 'string' &&
          blueprint.title.trim().length > 0 &&
          typeof blueprint.summary === 'string' &&
          blueprint.summary.trim().length > 0,
      );

      if (normalizedStarters.length > 0) {
        const drafts = normalizedStarters.map((blueprint) => ({
          type: blueprint.type,
          title: blueprint.title,
          summary: blueprint.summary,
          status: blueprint.status ?? 'draft',
          tags: blueprint.tags ?? [],
          relations: [],
          data: blueprint.data ?? getDefaultDataForType(blueprint.type, blueprint.title),
        }));

        await createArtifactsBulk(created.id, drafts);
      }
    },
    [profile, createProject, addXp, createArtifactsBulk, searchParams, setSearchParams],
  );

  const handleDeleteProject = useCallback(
    async (projectId: string) => {
      const success = await deleteProject(projectId);
      if (!success) {
        showToast('Failed to delete project. Please try again later.', { variant: 'error' });
        return;
      }
      setProjectActivityLog((prev) => {
        const next = { ...prev };
        delete next[projectId];
        return next;
      });
      setProjectPublishHistory((prev) => {
        if (!prev[projectId]) {
          return prev;
        }
        const next = { ...prev };
        delete next[projectId];
        return next;
      });
      if (projectIdFromUrl === projectId) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('projectId');
        setSearchParams(nextParams, { replace: true });
      }
    },
    [deleteProject, projectIdFromUrl, searchParams, setSearchParams, showToast],
  );

  const handleGitHubArtifactsImported = useCallback(
    async (newArtifacts: Artifact[]) => {
      if (newArtifacts.length === 0) {
        return;
      }

      const projectId = newArtifacts[0]?.projectId ?? selectedProjectId ?? projectIdFromUrl;
      if (!projectId) {
        return;
      }

      await createArtifactsBulk(
        projectId,
        newArtifacts.map((artifact) => ({
          id: artifact.id,
          type: artifact.type,
          title: artifact.title,
          summary: artifact.summary,
          status: artifact.status,
          tags: artifact.tags,
          relations: artifact.relations,
          data: artifact.data,
        })),
      );

      updateProjectActivity(projectId, { githubImported: true });
    },
    [createArtifactsBulk, projectIdFromUrl, selectedProjectId, updateProjectActivity],
  );

  const handleResetProjectFilters = useCallback(() => {
    setProjectStatusFilter('ALL');
    setProjectSearchTerm('');
  }, []);

  const handleProjectSearchTermChange = useCallback((value: string) => {
    setProjectSearchTerm(value);
  }, []);

  const handleProjectStatusFilterChange = useCallback((value: 'ALL' | ProjectStatus) => {
    setProjectStatusFilter(value);
  }, []);

  const handleOpenCreateProjectModal = useCallback(() => {
    setIsCreateProjectModalOpen(true);
  }, []);

  const selectedProjectPublishRecord = useMemo(
    () => (selectedProjectId ? projectPublishHistory[selectedProjectId] ?? null : null),
    [projectPublishHistory, selectedProjectId],
  );
  const lastPublishedAtLabel = useMemo(() => {
    if (!selectedProjectPublishRecord) {
      return null;
    }
    const timestamp = new Date(selectedProjectPublishRecord.publishedAt);
    if (Number.isNaN(timestamp.getTime())) {
      return null;
    }
    return timestamp.toLocaleString();
  }, [selectedProjectPublishRecord]);
  const emptyActivity = useMemo(() => createProjectActivity(), []);
  const selectedProjectActivity = useMemo(() => {
    if (!selectedProjectId) {
      return emptyActivity;
    }
    return projectActivityLog[selectedProjectId] ?? emptyActivity;
  }, [projectActivityLog, selectedProjectId, emptyActivity]);
  const milestoneProgress = useMemo<MilestoneProgressOverview[]>(() => {
    if (!selectedProjectId || !selectedProject) {
      return milestoneRoadmap.map((milestone) => ({
        milestone,
        objectives: milestone.objectives.map((objective) => ({
          ...objective,
          status: 'not-started' as const,
          detail: 'Select a project to track progress.',
        })),
        completion: 0,
      }));
    }

    return evaluateMilestoneProgress(milestoneRoadmap, {
      project: selectedProject,
      artifacts: projectArtifacts,
      profile,
      activity: selectedProjectActivity,
    });
  }, [
    selectedProjectId,
    selectedProject,
    projectArtifacts,
    profile,
    selectedProjectActivity,
  ]);

  const upcomingMilestoneOverview = useMemo(() => {
    const nextIncomplete = milestoneProgress.find((item) => item.completion < 1);
    return nextIncomplete ?? milestoneProgress[0] ?? null;
  }, [milestoneProgress]);

  const handleProfileUpdate = useCallback((updates: { displayName?: string; settings?: Partial<UserProfile['settings']> }) => {
    updateProfile(updates);
  }, [updateProfile]);

  const handleUpdateProject = useCallback(
    (projectId: string, updates: Partial<Project>) => {
      void updateProject(projectId, updates);
    },
    [updateProject],
  );

  const handleQuestlineClaim = useCallback((questlineId: string, xpReward: number) => {
    if (!profile) return;
    if (profile.questlinesClaimed.includes(questlineId)) return;
    addXp(xpReward);
    updateProfile({ questlinesClaimed: [questlineId] });
  }, [profile, addXp, updateProfile]);

  const handleLoadMoreProjects = useCallback(async () => {
    if (!canLoadMoreProjects) {
      return;
    }

    setIsLoadingMoreProjects(true);
    try {
      await loadMoreProjects();
    } catch (error) {
      console.error('Failed to load more projects', error);
      showToast('Unable to load additional projects right now. Please try again later.', {
        variant: 'error',
      });
    } finally {
      setIsLoadingMoreProjects(false);
    }
  }, [canLoadMoreProjects, loadMoreProjects, showToast]);

  const handleTutorialDismiss = useCallback(() => {
    setIsTutorialVisible(false);
    setTutorialProgress(previous => ({ ...previous, wasDismissed: true }));
  }, []);

  const handleTutorialStepChange = useCallback((step: number) => {
    setTutorialProgress(previous => ({ ...previous, currentStep: step }));
  }, []);

  const handleTutorialComplete = useCallback(() => {
    setTutorialProgress(previous => ({ ...previous, hasCompleted: true, wasDismissed: false }));
    setIsTutorialVisible(false);
  }, []);

  const handleStartTutorial = useCallback(() => {
    setTutorialProgress(previous => ({
      currentStep: 0,
      hasCompleted: false,
      wasDismissed: false,
      language: previous.language,
    }));
    setIsTutorialVisible(true);
  }, []);

  const handleFocusProjectSearch = useCallback(() => {
    const projectSearchInput = document.getElementById('project-search');
    if (projectSearchInput instanceof HTMLInputElement) {
      projectSearchInput.focus();
      projectSearchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const handleToggleZenMode = useCallback(() => {
    setIsZenMode((previous) => !previous);
  }, []);

  if (!profile) {
    return <DashboardShellPlaceholder loading={loading} />;
  }

  const xpProgress = profile.xp % 100;
  const level = Math.floor(profile.xp / 100) + 1;
  const isViewingOwnWorkspace = !selectedProject || selectedProject.ownerId === profile.uid;

  return (
    <TutorialLanguageProvider language={tutorialProgress.language}>
      <DepthPreferencesProvider>
        <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {isTutorialVisible && (
        <ErrorBoundary>
          <TutorialGuide
            initialStep={tutorialProgress.currentStep}
            language={tutorialProgress.language}
            onClose={handleTutorialDismiss}
            onStepChange={handleTutorialStepChange}
            onComplete={handleTutorialComplete}
          />
        </ErrorBoundary>
      )}
      <Header
        profile={profile}
        xpProgress={xpProgress}
        level={level}
        onSignOut={signOutUser}
        onStartTutorial={handleStartTutorial}
        onOpenProfileDrawer={handleOpenProfileDrawer}
        isZenMode={isZenMode}
        onToggleZenMode={handleToggleZenMode}
        adminAction={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleGhostAgent}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-indigo-200 border border-indigo-500/60 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors"
            >
              <SparklesIcon className="h-4 w-4" />
              Creative Atlas Agent
            </button>
          </div>
        }
      />
      {error && (
        <div className="px-4 sm:px-8 mt-4">
          <ErrorBanner message={error} onDismiss={clearError} />
        </div>
      )}
      <main
        id="main-content"
        className={`flex-grow grid grid-cols-1 gap-8 p-4 sm:p-8 ${isZenMode ? 'lg:grid-cols-1' : 'lg:grid-cols-12'}`}
      >
        {!isZenMode ? (
          <WorkspaceSidebar
            onOpenCreateProjectModal={handleOpenCreateProjectModal}
            projectSearchTerm={projectSearchTerm}
            onProjectSearchTermChange={handleProjectSearchTermChange}
            projectStatusFilter={projectStatusFilter}
            onProjectStatusFilterChange={handleProjectStatusFilterChange}
            hasProjectFilters={hasProjectFilters}
            onResetProjectFilters={handleResetProjectFilters}
            visibleProjects={visibleProjects}
            allProjects={projects}
            selectedProjectId={selectedProjectId}
            selectedProject={selectedProject}
            onSelectProject={handleSelectProject}
            onExitProject={handleReturnToAtlas}
            selectedProjectHiddenByFilters={selectedProjectHiddenBySidebarFilters}
            canLoadMoreProjects={canLoadMoreProjects}
            isLoadingMoreProjects={isLoadingMoreProjects}
            onLoadMoreProjects={handleLoadMoreProjects}
            projectArtifacts={projectArtifacts}
            artifactNavigator={artifactNavigator}
          />
        ) : null}

        <section className={`${isZenMode ? 'lg:col-span-1' : 'lg:col-span-9'} space-y-10`}>
          {selectedProject ? (
            <ProjectWorkspace
              profile={profile}
              project={selectedProject}
              allProjects={projects}
              projectArtifacts={projectArtifacts}
              allArtifacts={artifacts}
              level={level}
              xpProgress={xpProgress}
              isZenMode={isZenMode}
              projectConversations={projectConversations}
              projectNpcRuns={projectNpcRuns}
              onMemoryStatusChange={handleMemoryStatusChange}
              milestoneProgress={milestoneProgress}
              upcomingMilestoneOverview={upcomingMilestoneOverview}
              publishHistoryRecord={selectedProjectPublishRecord}
              lastPublishedAtLabel={lastPublishedAtLabel}
              visibilitySettings={currentProjectVisibility}
              onToggleVisibility={handleToggleComponentVisibility}
              onResetVisibility={handleResetComponentVisibility}
              onUpdateProject={handleUpdateProject}
              onDeleteProject={handleDeleteProject}
              onGitHubArtifactsImported={handleGitHubArtifactsImported}
              markProjectActivity={markSelectedProjectActivity}
              addXp={addXp}
              createArtifact={createArtifact}
              createArtifactsBulk={createArtifactsBulk}
              updateArtifact={updateArtifact}
              deleteArtifact={deleteArtifact}
              mergeArtifacts={mergeArtifacts}
              getIdToken={getIdToken}
              canUseDataApi={canUseDataApi}
              canPublishToGitHub={canPublishToGitHub}
              onStartGitHubPublish={startGitHubAuthorization}
              onRegisterArtifactNavigator={setArtifactNavigator}
            />
          ) : (
            <WorkspaceWelcome
              totalProjects={projects.length}
              totalArtifacts={artifacts.length}
              onCreateProject={handleOpenCreateProjectModal}
              onFocusProjectSearch={handleFocusProjectSearch}
              onStartTutorial={handleStartTutorial}
            />
          )}
        </section>
      </main>
      <Modal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        title="Create a New Project"
      >
        <CreateProjectForm
            onCreate={handleCreateProject}
            onClose={() => setIsCreateProjectModalOpen(false)}
        />
      </Modal>
      <PublishToGitHubModal
        isOpen={isPublishModalOpen}
        onClose={closePublishModal}
        onPublish={publishToRepository}
        isPublishing={isPublishing}
        errorMessage={publishError}
        successInfo={publishSuccess}
        onResetStatus={resetPublishStatus}
        authStatus={githubAuthStatus}
        statusMessage={githubAuthMessage}
      />
      <ProfileDrawer
        isOpen={isProfileDrawerOpen}
        onClose={handleCloseProfileDrawer}
        profile={profile}
        level={level}
        quests={todaysDailyQuests}
        questlines={questlines}
        claimedQuestlines={profile.questlinesClaimed}
        onClaimQuestline={handleQuestlineClaim}
        achievements={achievements}
        projects={projects}
        artifacts={artifacts}
        isViewingOwnWorkspace={isViewingOwnWorkspace}
        onUpdateProfile={handleProfileUpdate}
      />
      <GhostAgent
        ref={ghostAgentRef}
        showTriggerButton={false}
        projectContext={ghostAgentProjectContext}
      />
        </div>
      </DepthPreferencesProvider>
    </TutorialLanguageProvider>
  );
}

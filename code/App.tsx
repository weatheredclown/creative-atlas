import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
    Artifact,
    ArtifactType,
    Project,
    ProjectStatus,
    ProjectTemplate,
    InspirationCard,
    MemorySyncStatus,
    Relation,
    TaskData,
    TASK_STATE,
    type ProjectComponentKey,
    type ProjectVisibilitySettings,
    TemplateEntry,
    TemplateArtifactBlueprint,
    UserProfile,
    isNarrativeArtifactType,
} from './types';
import {
    PlusIcon,
    TableCellsIcon,
    ShareIcon,
    ViewColumnsIcon,
    ArrowUpTrayIcon,
    BuildingStorefrontIcon,
    FolderPlusIcon,
    SparklesIcon,
    GlobeAltIcon,
    GitHubIcon,
    CubeIcon,
    IntelligenceLogo,
} from './components/Icons';
import Header from './components/Header';
import Modal from './components/Modal';
import CreateArtifactForm from './components/CreateArtifactForm';
import CreateProjectForm from './components/CreateProjectForm';
import ProjectCard from './components/ProjectCard';
import Quests from './components/Quests';
import Achievements from './components/Achievements';
import ArtifactDetail from './components/ArtifactDetail';
import ArtifactListItem from './components/ArtifactListItem';
import GraphView from './components/GraphView';
import ConlangLexiconEditor from './components/ConlangLexiconEditor';
import StoryEditor from './components/StoryEditor';
import KanbanBoard from './components/KanbanBoard';
import CharacterEditor from './components/CharacterEditor';
import WikiEditor from './components/WikiEditor';
import LocationEditor from './components/LocationEditor';
import TaskEditor from './components/TaskEditor';
import TimelineEditor from './components/TimelineEditor';
import MagicSystemBuilder from './components/MagicSystemBuilder';
import {
  exportProjectAsStaticSite,
  exportChapterBibleMarkdown,
  exportChapterBiblePdf,
  exportLoreJson,
  createProjectStaticSiteFiles,
} from './utils/export';
import ProjectOverview from './components/ProjectOverview';
import ProjectInsights from './components/ProjectInsights';
import ProjectHero from './components/ProjectHero';
import ProjectSharePanel from './components/ProjectSharePanel';
import OpenTasksPanel from './components/OpenTasksPanel';
import { formatStatusLabel } from './utils/status';
import TemplateGallery from './components/TemplateGallery';
import { getDefaultDataForType } from './utils/artifactDefaults';
import ProjectTemplatePicker from './components/ProjectTemplatePicker';
import ReleaseNotesGenerator from './components/ReleaseNotesGenerator';
import StreakTracker from './components/StreakTracker';
import QuestlineBoard from './components/QuestlineBoard';
import { useUserData } from './contexts/UserDataContext';
import { useAuth } from './contexts/AuthContext';
import { useArtifactFilters } from './hooks/useArtifactFilters';
import { achievements } from './src/data/achievements';
import { aiAssistants } from './src/data/aiAssistants';
import { milestoneRoadmap } from './src/data/milestones';
import { questlines, selectDailyQuestsForDate } from './src/data/quests';
import { templateLibrary, projectTemplates } from './src/data/templates';
import { getCurrentDateKey } from './utils/date';
import {
  getCompletedTaskCount,
  getTotalRelations,
  getConlangLexemeCount,
  getWikiWordCount,
} from './utils/artifactMetrics';
import {
  QUICK_FACT_TAG,
  deriveQuickFactTitle,
  createQuickFactSummary,
  createQuickFactContent,
  cloneArtifactData,
  isQuickFactArtifact,
  sortQuickFactsByRecency,
} from './utils/quickFacts';
import {
  checkGitHubAuthorization,
  dataApiBaseUrl,
  downloadProjectExport,
  importArtifactsViaApi,
  isDataApiConfigured,
  startGitHubOAuth,
} from './services/dataApi';
import UserProfileCard from './components/UserProfileCard';
import GitHubImportPanel from './components/GitHubImportPanel';
import AICopilotPanel from './components/AICopilotPanel';
import MemorySyncPanel from './components/MemorySyncPanel';
import MilestoneTracker from './components/MilestoneTracker';
import ErrorBanner from './components/ErrorBanner';
import TutorialGuide from './components/TutorialGuide';
import ErrorBoundary from './components/ErrorBoundary';
import RevealDepthToggle from './components/RevealDepthToggle';
import { createProjectActivity, evaluateMilestoneProgress, MilestoneProgressOverview, ProjectActivity } from './utils/milestoneProgress';
import InfoModal from './components/InfoModal';
import PublishToGitHubModal, {
  GitHubAuthStatus,
  type PublishSuccessInfo,
} from './components/PublishToGitHubModal';
import { publishToGitHub } from './services/dataApi';
import QuickFactForm from './components/QuickFactForm';
import QuickFactsPanel from './components/QuickFactsPanel';
import { DepthPreferencesProvider } from './contexts/DepthPreferencesContext';
import NarrativeHealthPanel from './components/NarrativeHealthPanel';
import ContinuityMonitor from './components/ContinuityMonitor';
import InspirationDeck from './components/InspirationDeck';
import NarrativePipelineBoard from './components/NarrativePipelineBoard';
import WorldSimulationPanel from './components/WorldSimulationPanel';
import CharacterArcTracker from './components/CharacterArcTracker';
import FamilyTreeTools from './components/FamilyTreeTools';
import {
  PROJECT_FEATURE_GROUPS,
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

const DashboardShellPlaceholder: React.FC<{ loading: boolean }> = ({ loading }) => (
  <div className="min-h-screen flex flex-col bg-slate-950">
    <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800/70 px-4 sm:px-8 py-3">
      <div className="flex items-center gap-3">
        <CubeIcon className="w-7 h-7 text-cyan-400" />
        <h1 className="text-xl font-bold text-slate-100">Creative Atlas</h1>
      </div>
    </header>
    <main className="flex flex-1 items-center justify-center p-8">
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
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sourceArtifactId, setSourceArtifactId] = useState<string | null>(null);
  const [defaultCreateArtifactType, setDefaultCreateArtifactType] = useState<ArtifactType | null>(null);
  const [isQuickFactModalOpen, setIsQuickFactModalOpen] = useState(false);
  const [isSavingQuickFact, setIsSavingQuickFact] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState<'ALL' | ProjectStatus>('ALL');
  const [dailyQuestDayKey, setDailyQuestDayKey] = useState<string>(() => getCurrentDateKey());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [projectActivityLog, setProjectActivityLog] = useState<Record<string, ProjectActivity>>({});
  const [projectVisibilityMap, setProjectVisibilityMap] = useState<Record<string, ProjectVisibilitySettings>>(
    () => loadProjectVisibility(),
  );
  const [projectPublishHistory, setProjectPublishHistory] = useState<Record<string, ProjectPublishRecord>>(
    () => loadProjectPublishHistory(),
  );
  const [isLoadingMoreProjects, setIsLoadingMoreProjects] = useState(false);
  const [isTutorialVisible, setIsTutorialVisible] = useState(true);
  const [infoModalContent, setInfoModalContent] = useState<{ title: string; message: string } | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<PublishSuccessInfo | null>(null);
  const [githubAuthStatus, setGithubAuthStatus] = useState<GitHubAuthStatus>('idle');
  const [githubAuthMessage, setGithubAuthMessage] = useState<string | null>(null);
  const githubOAuthPopupRef = useRef<Window | null>(null);
  const githubOAuthMonitorRef = useRef<number | null>(null);
  const githubAuthStatusRef = useRef<GitHubAuthStatus>('idle');
  const dataApiEnabled = isDataApiConfigured && !isGuestMode;
  const githubAuthSuccessMessage =
    'GitHub authorization complete. Select a repository to publish your site.';

  const clearGithubOAuthMonitor = useCallback(() => {
    if (typeof window !== 'undefined' && githubOAuthMonitorRef.current !== null) {
      window.clearInterval(githubOAuthMonitorRef.current);
    }
    githubOAuthMonitorRef.current = null;
    githubOAuthPopupRef.current = null;
  }, []);

  const handleOpenPublishModal = useCallback(
    (status: GitHubAuthStatus = 'authorized', message: string | null = null) => {
      if (status !== 'authorizing') {
        clearGithubOAuthMonitor();
      }
      setPublishError(null);
      setPublishSuccess(null);
      githubAuthStatusRef.current = status;
      setGithubAuthStatus(status);
      setGithubAuthMessage(message);
      setIsPublishModalOpen(true);
    },
    [clearGithubOAuthMonitor],
  );

  const handleClosePublishModal = useCallback(() => {
    clearGithubOAuthMonitor();
    setIsPublishModalOpen(false);
    setPublishError(null);
    setPublishSuccess(null);
    githubAuthStatusRef.current = 'idle';
    setGithubAuthStatus('idle');
    setGithubAuthMessage(null);
  }, [clearGithubOAuthMonitor]);

  const handleResetPublishStatus = useCallback(() => {
    setPublishError(null);
    setPublishSuccess(null);
  }, []);

  useEffect(
    () => () => {
      clearGithubOAuthMonitor();
    },
    [clearGithubOAuthMonitor],
  );

  const verifyGithubAuthorization = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('Unable to verify GitHub authorization.');
      }

      const { authorized } = await checkGitHubAuthorization(token);
      if (authorized) {
        handleOpenPublishModal('authorized', githubAuthSuccessMessage);
        return;
      }

      const message =
        'GitHub authorization did not complete. Please try again.';
      handleOpenPublishModal('error', message);
      alert(message);
    } catch (error) {
      console.error('Failed to verify GitHub authorization', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to verify GitHub authorization. Please try again.';
      handleOpenPublishModal('error', message);
      alert(message);
    }
  }, [getIdToken, githubAuthSuccessMessage, handleOpenPublishModal]);
  
  const triggerDownload = useCallback((blob: Blob, filename:string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

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

  const todaysDailyQuests = useMemo(
    () => selectDailyQuestsForDate(dailyQuestDayKey),
    [dailyQuestDayKey],
  );

  const projectConversations = useMemo(
    () =>
      selectedProjectId
        ? memoryConversations.filter((conversation) => conversation.projectId === selectedProjectId)
        : [],
    [memoryConversations, selectedProjectId],
  );

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
    if (!projects.length) {
      setSelectedProjectId(null);
      setSelectedArtifactId(null);
      return;
    }
    if (!selectedProjectId || !projects.some(project => project.id === selectedProjectId)) {
      setSelectedProjectId(projects[0].id);
      setSelectedArtifactId(null);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const status = searchParams.get('github_auth');
    if (!status) {
      return;
    }

    if (status === 'success') {
      handleOpenPublishModal(
        'authorized',
        githubAuthSuccessMessage,
      );
    } else if (status === 'error') {
      const message =
        searchParams.get('github_message') ?? 'GitHub authorization failed.';
      handleOpenPublishModal('error', message);
      alert(message);
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('github_auth');
    url.searchParams.delete('github_message');
    const nextSearch = url.searchParams.toString();
    const nextPath = nextSearch ? `${url.pathname}?${nextSearch}` : url.pathname;
    window.history.replaceState({}, document.title, `${nextPath}${url.hash}`);
  }, [githubAuthSuccessMessage, handleOpenPublishModal]);

  useEffect(() => {
    let apiOrigin: string | null = null;
    if (dataApiBaseUrl) {
      try {
        apiOrigin = new URL(dataApiBaseUrl).origin;
      } catch (error) {
        console.warn('Unable to parse data API base URL for GitHub OAuth messaging', error);
      }
    }

    const handleMessage = (event: MessageEvent) => {
      if (apiOrigin && event.origin !== apiOrigin) {
        return;
      }

      let payload: unknown = event.data;

      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch (error) {
          console.warn('Received non-JSON GitHub OAuth message', error);
          return;
        }
      }

      if (!payload || typeof payload !== 'object') {
        return;
      }

      const messagePayload = payload as { type?: unknown; status?: unknown; message?: unknown };
      if (messagePayload.type !== 'github-oauth') {
        return;
      }

      if (messagePayload.status === 'success') {
        handleOpenPublishModal(
          'authorized',
          githubAuthSuccessMessage,
        );
      } else if (messagePayload.status === 'error') {
        const message =
          typeof messagePayload.message === 'string'
            ? messagePayload.message
            : 'GitHub authorization failed.';
        handleOpenPublishModal('error', message);
        alert(message);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [githubAuthSuccessMessage, handleOpenPublishModal]);

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

  const openCreateArtifactModal = useCallback(
    ({ defaultType = null, sourceId = null }: { defaultType?: ArtifactType | null; sourceId?: string | null } = {}) => {
      setDefaultCreateArtifactType(defaultType ?? null);
      setSourceArtifactId(sourceId ?? null);
      setIsCreateModalOpen(true);
    },
    [],
  );

  const closeCreateArtifactModal = useCallback(() => {
    setIsCreateModalOpen(false);
    setSourceArtifactId(null);
    setDefaultCreateArtifactType(null);
  }, []);

  const handleUpdateArtifactData = useCallback(
    (artifactId: string, data: Artifact['data']) => {
      const target = artifacts.find((artifact) => artifact.id === artifactId);
      if (!target) {
        return;
      }
      if (
        target.type === ArtifactType.Task &&
        (data as TaskData).state === TASK_STATE.Done &&
        (target.data as TaskData | undefined)?.state !== TASK_STATE.Done
      ) {
        void addXp(8); // XP Source: close task (+8)
      }
      void updateArtifact(artifactId, { data });
    },
    [artifacts, addXp, updateArtifact],
  );

  const handleUpdateArtifact = useCallback(
    (artifactId: string, updates: Partial<Artifact>) => {
      void updateArtifact(artifactId, updates);
    },
    [updateArtifact],
  );

  const sanitizeRelationKind = useCallback((value: string) => value.trim().toUpperCase(), []);

  const getReciprocalRelationKind = useCallback((kind: string): string => {
    const normalized = sanitizeRelationKind(kind);
    switch (normalized) {
      case 'PARENT_OF':
        return 'CHILD_OF';
      case 'CHILD_OF':
        return 'PARENT_OF';
      case 'SIBLING_OF':
      case 'PARTNER_OF':
      case 'MARRIED_TO':
      case 'SPOUSE_OF':
        return normalized;
      default:
        return normalized;
    }
  }, [sanitizeRelationKind]);

  const handleAddRelation = useCallback(
    (fromId: string, toId: string, kind: string) => {
      const source = artifacts.find((artifact) => artifact.id === fromId);
      const target = artifacts.find((artifact) => artifact.id === toId);
      if (!source || !target) {
        return;
      }

      const normalizedKind = sanitizeRelationKind(kind);
      const reciprocalKind = getReciprocalRelationKind(normalizedKind);

      const newRelation: Relation = { toId, kind: normalizedKind };
      const reciprocalRelation: Relation = { toId: fromId, kind: reciprocalKind };

      const sourceHasRelation = source.relations.some((relation) => relation.toId === toId);
      const nextSourceRelations = sourceHasRelation
        ? source.relations.map((relation) => (relation.toId === toId ? newRelation : relation))
        : [...source.relations, newRelation];

      const shouldUpdateSource = sourceHasRelation
        ? source.relations.some(
            (relation) => relation.toId === toId && relation.kind !== normalizedKind,
          )
        : true;
      if (shouldUpdateSource) {
        void updateArtifact(fromId, { relations: nextSourceRelations });
      }

      const reciprocalExists = target.relations.some((relation) => relation.toId === fromId);
      const nextTargetRelations = reciprocalExists
        ? target.relations.map((relation) =>
            relation.toId === fromId ? reciprocalRelation : relation,
          )
        : [...target.relations, reciprocalRelation];

      const shouldUpdateTarget = reciprocalExists
        ? target.relations.some(
            (relation) => relation.toId === fromId && relation.kind !== reciprocalKind,
          )
        : true;

      if (shouldUpdateTarget) {
        void updateArtifact(toId, { relations: nextTargetRelations });
      }
    },
    [artifacts, getReciprocalRelationKind, sanitizeRelationKind, updateArtifact],
  );

  const handleRemoveRelation = useCallback(
    (fromId: string, relationIndex: number) => {
      const source = artifacts.find((artifact) => artifact.id === fromId);
      if (!source) {
        return;
      }

      const relationToRemove = source.relations[relationIndex];
      if (!relationToRemove) {
        return;
      }

      const nextRelations = source.relations.filter((_, index) => index !== relationIndex);
      void updateArtifact(fromId, { relations: nextRelations });

      const target = artifacts.find((artifact) => artifact.id === relationToRemove.toId);
      if (!target) {
        return;
      }

      const nextTargetRelations = target.relations.filter(
        (relation) => relation.toId !== fromId,
      );
      if (nextTargetRelations.length !== target.relations.length) {
        void updateArtifact(relationToRemove.toId, { relations: nextTargetRelations });
      }
    },
    [artifacts, updateArtifact],
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId],
  );
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
  const projectArtifacts = useMemo(
    () => artifacts.filter((artifact) => artifact.projectId === selectedProjectId),
    [artifacts, selectedProjectId],
  );
  const handleViewModeAnalytics = useCallback(
    (mode: 'table' | 'graph' | 'kanban') => {
      if (mode === 'graph') {
        markSelectedProjectActivity({ viewedGraph: true });
      }
      if (mode === 'kanban') {
        markSelectedProjectActivity({ viewedKanban: true });
      }
    },
    [markSelectedProjectActivity],
  );

  const {
    viewMode,
    setViewMode,
    artifactTypeFilter,
    setArtifactTypeFilter,
    statusFilter,
    setStatusFilter,
    activeTagFilters,
    searchTerm,
    setSearchTerm,
    filteredArtifacts,
    availableStatuses,
    availableTagFilters,
    hasActiveFilters,
    resetFilters,
    toggleTagFilter,
    isSelectedArtifactHidden,
  } = useArtifactFilters(projectArtifacts, {
    initialViewMode: 'table',
    onViewModeChange: handleViewModeAnalytics,
  });

  useEffect(() => {
    if (searchTerm.trim() === '') {
      return;
    }
    markSelectedProjectActivity({ usedSearch: true });
  }, [searchTerm, markSelectedProjectActivity]);

  useEffect(() => {
    if (artifactTypeFilter === 'ALL' && statusFilter === 'ALL') {
      return;
    }
    markSelectedProjectActivity({ usedFilters: true });
  }, [artifactTypeFilter, statusFilter, markSelectedProjectActivity]);

  const quickFacts = useMemo(() => {
    if (!selectedProjectId) {
      return [];
    }
    return projectArtifacts.filter(isQuickFactArtifact).slice().sort(sortQuickFactsByRecency);
  }, [projectArtifacts, selectedProjectId]);
  const quickFactPreview = useMemo(() => quickFacts.slice(0, 4), [quickFacts]);
  const projectHeroStats = useMemo(() => {
    if (!selectedProject) {
      return null;
    }

    const tagSet = new Set<string>();
    projectArtifacts.forEach((artifact) => {
      (artifact.tags ?? []).forEach((tag) => {
        const normalized = tag.trim().toLowerCase();
        if (normalized.length > 0) {
          tagSet.add(normalized);
        }
      });
    });

    const narrativePieces = projectArtifacts.filter((artifact) => isNarrativeArtifactType(artifact.type)).length;

    return {
      totalArtifacts: projectArtifacts.length,
      completedTasks: getCompletedTaskCount(projectArtifacts),
      quickFactCount: quickFacts.length,
      relationCount: getTotalRelations(projectArtifacts),
      uniqueTagCount: tagSet.size,
      narrativeCount: narrativePieces,
      wikiWordCount: getWikiWordCount(projectArtifacts),
      lexemeCount: getConlangLexemeCount(projectArtifacts),
    };
  }, [selectedProject, projectArtifacts, quickFacts]);
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

  const handleDeleteArtifact = useCallback(
    async (artifactId: string) => {
      const success = await deleteArtifact(artifactId);
      if (!success) {
        alert('Failed to delete artifact. Please try again later.');
        return;
      }
      setSelectedArtifactId((current) => (current === artifactId ? null : current));
    },
    [deleteArtifact],
  );

  const handleDuplicateArtifact = useCallback(
    async (artifactId: string) => {
      if (!selectedProjectId) {
        alert('Select a project before duplicating an artifact.');
        return;
      }

      const source = projectArtifacts.find((artifact) => artifact.id === artifactId);
      if (!source) {
        alert('We could not find the artifact to duplicate.');
        return;
      }

      const existingTitles = new Set(projectArtifacts.map((artifact) => artifact.title.toLowerCase()));
      const trimmedSourceTitle = source.title.trim();
      const baseTitle = trimmedSourceTitle.length > 0 ? `${trimmedSourceTitle} (copy)` : 'Untitled artifact (copy)';
      let candidateTitle = baseTitle;
      let attempt = 2;
      while (existingTitles.has(candidateTitle.toLowerCase())) {
        candidateTitle = `${baseTitle} ${attempt}`;
        attempt += 1;
      }

      const clonedData = cloneArtifactData(source.data);
      const draft: {
        type: ArtifactType;
        title: string;
        summary: string;
        status: string;
        tags: string[];
        relations: Relation[];
        data?: Artifact['data'];
      } = {
        type: source.type,
        title: candidateTitle,
        summary: source.summary,
        status: source.status,
        tags: [...source.tags],
        relations: [],
      };

      if (clonedData !== undefined) {
        draft.data = clonedData;
      }

      const created = await createArtifact(selectedProjectId, draft);
      if (!created) {
        alert('We could not duplicate this artifact. Please try again later.');
        return;
      }

      setSelectedArtifactId(created.id);
      void addXp(2);
      setInfoModalContent({
        title: 'Artifact duplicated',
        message: `Created ${created.title} from ${source.title}.`,
      });
    },
    [selectedProjectId, projectArtifacts, createArtifact, addXp, setInfoModalContent],
  );

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id);
    setSelectedArtifactId(null);
    resetFilters();
  };

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
      setSelectedProjectId(created.id);
      setSelectedArtifactId(null);
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

        const createdArtifacts = await createArtifactsBulk(created.id, drafts);
        if (createdArtifacts.length > 0) {
          setInfoModalContent({
            title: 'Starter artifacts created',
            message: `We drafted ${createdArtifacts.length} starter artifact${createdArtifacts.length > 1 ? 's' : ''} from your project brief.`,
          });
          setSelectedArtifactId(createdArtifacts[0].id);
        }
      }
    },
    [profile, createProject, addXp, createArtifactsBulk],
  );

  const handleDeleteProject = useCallback(
    async (projectId: string) => {
      const projectArtifactIds = artifacts
        .filter((artifact) => artifact.projectId === projectId)
        .map((artifact) => artifact.id);
      const success = await deleteProject(projectId);
      if (!success) {
        alert('Failed to delete project. Please try again later.');
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
      setSelectedProjectId((current) => (current === projectId ? null : current));
      setSelectedArtifactId((current) =>
        current && projectArtifactIds.includes(current) ? null : current,
      );
    },
    [artifacts, deleteProject],
  );

  const handleCreateArtifact = useCallback(
    async ({ title, type, summary, sourceArtifactId: sourceId }: { title: string; type: ArtifactType; summary: string, sourceArtifactId?: string | null }) => {
      if (!selectedProjectId || !profile) return;

      const data: Artifact['data'] = getDefaultDataForType(type, title);

      const created = await createArtifact(selectedProjectId, {
        type,
        title,
        summary,
        status: 'idea',
        tags: [],
        relations: [],
        data,
      });

      if (created) {
        if (sourceId) {
          handleAddRelation(created.id, sourceId, 'RELATES_TO');
        }
        void addXp(5);
        closeCreateArtifactModal();
        setSelectedArtifactId(created.id);
      }
    },
    [selectedProjectId, profile, createArtifact, addXp, handleAddRelation, closeCreateArtifactModal],
  );

  const handleSelectTemplate = useCallback(async (template: TemplateEntry) => {
    if (!selectedProjectId) {
      alert('Please select a project before adding an artifact from a template.');
      return;
    }

    const data: Artifact['data'] = getDefaultDataForType(template.type, template.name);
    const created = await createArtifact(selectedProjectId, {
      type: template.type,
      title: template.name,
      summary: template.description,
      status: 'draft',
      tags: template.tags ?? [],
      relations: [],
      data,
    });

    if (created) {
      void addXp(5);
      setSelectedArtifactId(created.id);
    }
  }, [selectedProjectId, createArtifact, addXp]);

  const handleApplyProjectTemplate = useCallback(async (template: ProjectTemplate) => {
    if (!profile || !selectedProjectId) return;

    const projectArtifactsForSelection = artifacts.filter(artifact => artifact.projectId === selectedProjectId);
    const existingTitles = new Set(projectArtifactsForSelection.map(artifact => artifact.title.toLowerCase()));
    const timestamp = Date.now();

    const drafts = template.artifacts
      .filter(blueprint => !existingTitles.has(blueprint.title.toLowerCase()))
      .map((blueprint, index) => ({
        id: `art-${timestamp + index}`,
        type: blueprint.type,
        title: blueprint.title,
        summary: blueprint.summary,
        status: blueprint.status ?? 'draft',
        tags: blueprint.tags ? [...blueprint.tags] : [],
        relations: [],
        data: blueprint.data ?? getDefaultDataForType(blueprint.type, blueprint.title),
      }));

    if (drafts.length > 0) {
      const created = await createArtifactsBulk(selectedProjectId, drafts);
      if (created.length > 0) {
        void addXp(created.length * 5);
        setSelectedArtifactId(created[0].id);
        setInfoModalContent({
          title: 'Template Applied',
          message: `Added ${created.length} starter artifact${created.length > 1 ? 's' : ''} from the ${template.name} template.`,
        });
      }
    } else {
      setInfoModalContent({
        title: 'Template Not Applied',
        message: 'All of the template\'s starter artifacts already exist in this project.',
      });
    }

    if (template.projectTags.length > 0) {
      const selected = projects.find((project) => project.id === selectedProjectId);
      if (selected) {
        const mergedTags = Array.from(new Set([...selected.tags, ...template.projectTags]));
        if (mergedTags.length !== selected.tags.length) {
          void updateProject(selectedProjectId, { tags: mergedTags });
        }
      }
    }
  }, [profile, selectedProjectId, artifacts, createArtifactsBulk, addXp, projects, updateProject]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProjectId) return;

    if (!dataApiEnabled) {
      alert('Artifact import requires a connection to the data server.');
      event.target.value = '';
      return;
    }

    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('Unable to authenticate the import request.');
      }

      const content = await file.text();
      const { artifacts: imported } = await importArtifactsViaApi(token, selectedProjectId, content);
      const existingIds = new Set(artifacts.map((artifact) => artifact.id));
      const newArtifacts = imported.filter((artifact) => !existingIds.has(artifact.id));

      if (newArtifacts.length > 0) {
        mergeArtifacts(selectedProjectId, newArtifacts);
        alert(`${newArtifacts.length} new artifacts imported successfully!`);
        markSelectedProjectActivity({ importedCsv: true });
      } else {
        alert('No new artifacts to import. All IDs in the file already exist.');
      }
    } catch (error) {
      console.error('Artifact import failed', error);
      alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      event.target.value = '';
    }
  };

  const handleGitHubArtifactsImported = useCallback(
    async (newArtifacts: Artifact[]) => {
      if (newArtifacts.length === 0) {
        return;
      }

      const projectId = newArtifacts[0]?.projectId ?? selectedProjectId;
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
    [createArtifactsBulk, selectedProjectId, updateProjectActivity],
  );

  const handlePublish = () => {
    if (selectedProject && projectArtifacts.length > 0) {
        exportProjectAsStaticSite(selectedProject, projectArtifacts);
        markSelectedProjectActivity({ publishedSite: true });
        addXp(25); // XP Source: publish (+25)
    } else {
        alert('Please select a project with artifacts to publish.');
    }
  };

  const handlePublishToGithub = async () => {
    if (!isDataApiConfigured || !dataApiBaseUrl) {
      const message = 'Publishing to GitHub is unavailable because the data API is not configured.';
      handleOpenPublishModal('error', message);
      alert(message);
      return;
    }

    handleOpenPublishModal(
      'authorizing',
      'Authorizing with GitHub. Complete the pop-up window to continue.',
    );

    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('Unable to authenticate the GitHub authorization request.');
      }

      const { authUrl } = await startGitHubOAuth(token);
      if (typeof window !== 'undefined') {
        const popup = window.open(
          authUrl,
          'creative-atlas-github-oauth',
          'width=600,height=700',
        );

        if (!popup) {
          window.location.href = authUrl;
          return;
        }

        githubOAuthPopupRef.current = popup;

        if (githubOAuthMonitorRef.current !== null) {
          window.clearInterval(githubOAuthMonitorRef.current);
        }

        githubOAuthMonitorRef.current = window.setInterval(() => {
          const popupWindow = githubOAuthPopupRef.current;
          if (popupWindow && !popupWindow.closed) {
            return;
          }

          clearGithubOAuthMonitor();

          if (githubAuthStatusRef.current === 'authorizing') {
            void verifyGithubAuthorization();
          }
        }, 500);
      }
    } catch (error) {
      console.error('Failed to initiate GitHub authorization', error);
      const message = `Unable to start GitHub authorization. ${
        error instanceof Error ? error.message : 'Please try again.'
      }`;
      handleOpenPublishModal('error', message);
      alert(message);
    }
  };

  const handlePublishToGithubRepo = async (repoName: string, publishDir: string) => {
    if (!selectedProject) {
      setPublishError('Select a project to publish to GitHub.');
      return;
    }

    if (projectArtifacts.length === 0) {
      setPublishError('Add at least one artifact before publishing to GitHub.');
      return;
    }

    const siteFiles = createProjectStaticSiteFiles(selectedProject, projectArtifacts);

    if (siteFiles.length === 0) {
      setPublishError('No publishable content was generated for this project.');
      return;
    }

    setPublishError(null);
    setPublishSuccess(null);

    const trimmedPublishDir = publishDir.trim();
    const normalizedPublishDir = trimmedPublishDir.replace(/^\/+|\/+$/g, '');
    let publishDirectory = '';

    if (normalizedPublishDir.length > 0) {
      if (normalizedPublishDir.toLowerCase() === 'docs') {
        publishDirectory = 'docs';
      } else {
        setPublishError(
          'GitHub Pages only supports publishing from the site root or a docs/ folder. Leave the field blank or enter "docs".',
        );
        return;
      }
    }

    setIsPublishing(true);
    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('Unable to authenticate the GitHub publish request.');
      }

      const result = await publishToGitHub(token, repoName, publishDirectory, siteFiles);
// MERGED FIX:
      const normalizedDirectory = publishDirectory.replace(/^\/+|\/+$/g, '');
      const encodedDirectoryPath = normalizedDirectory
        ? normalizedDirectory.split('/').map(encodeURIComponent).join('/')
        : '';
      
      const branchUrl = `https://github.com/${result.repository}/tree/gh-pages${
        encodedDirectoryPath ? `/${encodedDirectoryPath}` : ''
      }`;

      // 1. Set the structured success object for the modal (from 'codex' branch)
      setPublishSuccess({
        message: result.message,
        pagesUrl: result.pagesUrl,
        branchUrl,
        branchDirectory: normalizedDirectory || null,
      });

      // 2. Persist the publish history (from 'main' branch)
      setProjectPublishHistory((prev) => ({
        ...prev,
        [selectedProject.id]: {
          repository: repoName,
          publishDirectory,
          pagesUrl: result.pagesUrl,
          publishedAt: new Date().toISOString(),
        },
      }));      
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while publishing to GitHub.';
      setPublishError(message);
      throw new Error(message);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleResetProjectFilters = useCallback(() => {
    setProjectStatusFilter('ALL');
    setProjectSearchTerm('');
  }, []);

  const handleQuickFactSubmit = useCallback(
    async ({ fact, detail }: { fact: string; detail?: string }) => {
      if (!selectedProjectId || !selectedProject) {
        throw new Error('Select a project before saving a fact.');
      }

      const trimmedFact = fact.trim();
      const trimmedDetail = detail?.trim();
      if (!trimmedFact) {
        throw new Error('Capture at least one sentence for your fact.');
      }

      setIsSavingQuickFact(true);

      try {
        const existingFactCount = projectArtifacts.filter(isQuickFactArtifact).length;

        const safeProjectTitle = selectedProject.title.trim().length > 0 ? selectedProject.title.trim() : 'Project';
        const fallbackTitle = `${safeProjectTitle} Fact #${existingFactCount + 1}`;
        const title = deriveQuickFactTitle(trimmedFact, fallbackTitle);
        const summary = createQuickFactSummary(trimmedFact, trimmedDetail);
        const content = createQuickFactContent(title, trimmedFact, trimmedDetail);

        const created = await createArtifact(selectedProjectId, {
          type: ArtifactType.Wiki,
          title,
          summary,
          status: 'draft',
          tags: [QUICK_FACT_TAG],
          relations: [],
          data: { content },
        });

        if (!created) {
          throw new Error('We could not save your fact. Please try again.');
        }

        void addXp(3);
        setSelectedArtifactId(created.id);
        setIsQuickFactModalOpen(false);
      } catch (error) {
        console.error('Failed to save quick fact', error);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('We could not save your fact. Please try again.');
      } finally {
        setIsSavingQuickFact(false);
      }
    },
    [selectedProjectId, selectedProject, projectArtifacts, createArtifact, addXp],
  );

  const handleCaptureInspirationCard = useCallback(
    async (card: InspirationCard) => {
      if (!selectedProjectId || !selectedProject) {
        alert('Select a project before capturing inspiration.');
        return;
      }

      const suitTag = card.suit.toLowerCase().replace(/\s+/g, '-');
      const title = `${card.suit} Spark: ${card.title}`;
      const summary = card.prompt;
      const content = [
        `# ${card.title}`,
        '',
        card.prompt,
        '',
        card.detail,
        '',
        `Tags: ${card.tags.map((tag) => `#${tag}`).join(' ')}`,
      ].join('\n');

      const created = await createArtifact(selectedProjectId, {
        type: ArtifactType.Wiki,
        title,
        summary,
        status: 'idea',
        tags: ['inspiration', suitTag, ...card.tags],
        relations: [],
        data: { content },
      });

      if (created) {
        void addXp(2);
        setSelectedArtifactId(created.id);
      }
    },
    [selectedProjectId, selectedProject, createArtifact, addXp],
  );
  const selectedArtifact = useMemo(() => artifacts.find(a => a.id === selectedArtifactId), [artifacts, selectedArtifactId]);
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

  const filteredSelectedArtifactHidden = isSelectedArtifactHidden(selectedArtifactId);

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

  const handleResetFilters = useCallback(() => {
    resetFilters();
  }, [resetFilters]);

  const handleToggleTagFilter = useCallback((tag: string) => {
    toggleTagFilter(tag);
  }, [toggleTagFilter]);

  const handleExportArtifacts = useCallback(
    async (format: 'csv' | 'tsv') => {
      if (!selectedProject) {
        return;
      }

      if (!dataApiEnabled) {
        alert('Artifact export requires a connection to the data server.');
        return;
      }

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('Unable to authenticate the export request.');
        }

        const blob = await downloadProjectExport(token, selectedProject.id, format);
        const filename = `${selectedProject.title.replace(/\s+/g, '_').toLowerCase()}_artifacts.${format}`;
        triggerDownload(blob, filename);
        markSelectedProjectActivity({ exportedData: true });
      } catch (error) {
        console.error('Artifact export failed', error);
        alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    [selectedProject, dataApiEnabled, getIdToken, triggerDownload, markSelectedProjectActivity],
  );

  const handleChapterBibleExport = useCallback(
    async (format: 'markdown' | 'pdf') => {
      if (!selectedProject) {
        return;
      }

      if (projectArtifacts.length === 0) {
        alert('Capture some lore before exporting a chapter bible.');
        return;
      }

      try {
        if (format === 'markdown') {
          exportChapterBibleMarkdown(selectedProject, projectArtifacts);
        } else {
          await exportChapterBiblePdf(selectedProject, projectArtifacts);
        }
        markSelectedProjectActivity({ exportedData: true });
      } catch (error) {
        console.error('Chapter bible export failed', error);
        alert('Unable to export the chapter bible right now. Please try again.');
      }
    },
    [selectedProject, projectArtifacts, markSelectedProjectActivity],
  );

  const handleLoreJsonExport = useCallback(() => {
    if (!selectedProject) {
      return;
    }

    if (projectArtifacts.length === 0) {
      alert('Capture some lore before exporting a lore bundle.');
      return;
    }

    try {
      exportLoreJson(selectedProject, projectArtifacts);
      markSelectedProjectActivity({ exportedData: true });
    } catch (error) {
      console.error('Lore JSON export failed', error);
      alert('Unable to export lore JSON right now. Please try again.');
    }
  }, [selectedProject, projectArtifacts, markSelectedProjectActivity]);

  const handleExportOptionSelection = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;

    if (value === '') {
      return;
    }

    switch (value) {
      case 'export-csv':
        void handleExportArtifacts('csv');
        break;
      case 'export-tsv':
        void handleExportArtifacts('tsv');
        break;
      case 'export-chapter-markdown':
        void handleChapterBibleExport('markdown');
        break;
      case 'export-chapter-pdf':
        void handleChapterBibleExport('pdf');
        break;
      case 'export-lore-json':
        handleLoreJsonExport();
        break;
      default:
        break;
    }

    event.target.value = '';
  }, [handleExportArtifacts, handleChapterBibleExport, handleLoreJsonExport]);

  const handleLoadMoreProjects = useCallback(async () => {
    if (!canLoadMoreProjects) {
      return;
    }

    setIsLoadingMoreProjects(true);
    try {
      await loadMoreProjects();
    } catch (error) {
      console.error('Failed to load more projects', error);
      alert('Unable to load additional projects right now. Please try again later.');
    } finally {
      setIsLoadingMoreProjects(false);
    }
  }, [canLoadMoreProjects, loadMoreProjects]);

  const handleViewModeChange = useCallback((mode: 'table' | 'graph' | 'kanban') => {
    setViewMode(mode);
  }, [setViewMode]);

  if (!profile) {
    return <DashboardShellPlaceholder loading={loading} />;
  }

  const xpProgress = profile.xp % 100;
  const level = Math.floor(profile.xp / 100) + 1;
  const isViewingOwnWorkspace = !selectedProject || selectedProject.ownerId === profile.uid;
  const featuredAssistant = aiAssistants[0];

  const ViewSwitcher = () => (
    <div className="flex items-center gap-1 p-1 bg-slate-700/50 rounded-lg">
        <button onClick={() => handleViewModeChange('table')} className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-colors ${viewMode === 'table' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
            <TableCellsIcon className="w-4 h-4" /> Table
        </button>
        <button onClick={() => handleViewModeChange('graph')} className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-colors ${viewMode === 'graph' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
            <ShareIcon className="w-4 h-4" /> Graph
        </button>
        <button onClick={() => handleViewModeChange('kanban')} className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-colors ${viewMode === 'kanban' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
            <ViewColumnsIcon className="w-4 h-4" /> Kanban
        </button>
    </div>
  );

  return (
    <DepthPreferencesProvider>
      <div className="min-h-screen flex flex-col">
      {isTutorialVisible && (
        <ErrorBoundary>
          <TutorialGuide onClose={() => setIsTutorialVisible(false)} />
        </ErrorBoundary>
      )}
      <Header profile={profile} xpProgress={xpProgress} level={level} onSignOut={signOutUser} onStartTutorial={() => setIsTutorialVisible(true)} />
      {error && (
        <div className="px-4 sm:px-8 mt-4">
          <ErrorBanner message={error} onDismiss={clearError} />
        </div>
      )}
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 sm:p-8">
        <aside className="lg:col-span-3 space-y-6">
          {isViewingOwnWorkspace && (
            <UserProfileCard profile={profile} onUpdateProfile={handleProfileUpdate} />
          )}
          <StreakTracker currentStreak={profile.streakCount} bestStreak={profile.bestStreak} level={level} />
          <div>
            <div className="flex justify-between items-center px-2 mb-4">
                <h2 className="text-lg font-semibold text-slate-300">Projects</h2>
                <button
                    id="create-new-project-button"
                    onClick={() => setIsCreateProjectModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-cyan-300 bg-cyan-900/50 hover:bg-cyan-800/50 rounded-md transition-colors"
                    title="Create New Project"
                >
                    <FolderPlusIcon className="w-4 h-4" />
                    New
                </button>
            </div>
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3 space-y-3">
                <div className="space-y-1">
                  <label
                    htmlFor="project-search"
                    className="text-xs font-semibold uppercase tracking-wide text-slate-400"
                  >
                    Search
                  </label>
                  <input
                    id="project-search"
                    type="search"
                    value={projectSearchTerm}
                    onChange={(event) => setProjectSearchTerm(event.target.value)}
                    placeholder="Project name, summary, or tag"
                    className="w-full rounded-md border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="project-status-filter"
                    className="text-xs font-semibold uppercase tracking-wide text-slate-400"
                  >
                    Status
                  </label>
                  <select
                    id="project-status-filter"
                    value={projectStatusFilter}
                    onChange={(event) =>
                      setProjectStatusFilter(event.target.value as ProjectStatus | 'ALL')
                    }
                    className="w-full rounded-md border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="ALL">All statuses</option>
                    {Object.values(ProjectStatus).map((status) => (
                      <option key={status} value={status}>
                        {formatStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    {hasProjectFilters
                      ? `Showing ${visibleProjects.length} of ${projects.length} projects`
                      : `${projects.length} project${projects.length === 1 ? '' : 's'} available`}
                  </span>
                  {hasProjectFilters && (
                    <button
                      type="button"
                      onClick={handleResetProjectFilters}
                      className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>

              {selectedProjectHiddenBySidebarFilters && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 space-y-2">
                  <p>The selected project is hidden by the current filters.</p>
                  <button
                    type="button"
                    onClick={handleResetProjectFilters}
                    className="inline-flex items-center gap-1 rounded-md border border-amber-400/40 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-100 transition-colors hover:border-amber-300/60 hover:text-amber-50"
                  >
                    Show project
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {visibleProjects.length > 0 ? (
                  visibleProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onSelect={handleSelectProject}
                      isSelected={project.id === selectedProjectId}
                    />
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-700/70 px-4 py-6 text-center text-sm text-slate-400">
                    {hasProjectFilters
                      ? 'No projects match the current filters. Adjust your search or clear the filters to rediscover a world.'
                      : 'No projects yet. Start your first world to build an atlas.'}
                  </div>
                )}
                {!hasProjectFilters && canLoadMoreProjects && (
                  <button
                    type="button"
                    onClick={() => {
                      void handleLoadMoreProjects();
                    }}
                    className="w-full px-3 py-2 text-sm font-semibold text-cyan-200 bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-800/50 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={isLoadingMoreProjects}
                  >
                    {isLoadingMoreProjects ? 'Loading more projects…' : 'Load more projects'}
                  </button>
                )}
              </div>
            </div>
          </div>
          <Quests quests={todaysDailyQuests} artifacts={artifacts} projects={projects} />
          <QuestlineBoard
            questlines={questlines}
            artifacts={artifacts}
            projects={projects}
            profile={profile}
            level={level}
            claimedQuestlines={profile.questlinesClaimed}
            onClaim={handleQuestlineClaim}
          />
          <Achievements achievements={achievements} artifacts={artifacts} projects={projects} />
        </aside>

        <section className="lg:col-span-9 space-y-10">
          {selectedProject ? (
            <>
              <section className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-100">{PROJECT_FEATURE_GROUPS.summary.title}</h2>
                  <p className="text-sm text-slate-400">{PROJECT_FEATURE_GROUPS.summary.description}</p>
                </div>
                <div className="space-y-6">
                  {currentProjectVisibility.projectHero && projectHeroStats ? (
                    <ProjectHero
                      project={selectedProject}
                      stats={projectHeroStats}
                      quickFacts={quickFactPreview}
                      totalQuickFacts={quickFacts.length}
                      statusLabel={formatStatusLabel(selectedProject.status)}
                      onCreateArtifact={() => openCreateArtifactModal()}
                      onCaptureQuickFact={() => setIsQuickFactModalOpen(true)}
                      onPublishProject={handlePublish}
                      onSelectQuickFact={setSelectedArtifactId}
                      level={level}
                      xpProgress={xpProgress}
                    />
                  ) : null}
                  <ProjectSharePanel project={selectedProject} />
                  {currentProjectVisibility.projectOverview && (
                    <ProjectOverview
                      project={selectedProject}
                      onUpdateProject={handleUpdateProject}
                      onDeleteProject={handleDeleteProject}
                      visibilitySettings={currentProjectVisibility}
                      onToggleVisibility={handleToggleComponentVisibility}
                      onResetVisibility={handleResetComponentVisibility}
                    />
                  )}
                  {currentProjectVisibility.artifactExplorer && (
                    <section className="space-y-6 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5 shadow-lg shadow-slate-950/20">
                      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-1">
                          <h3 className="text-2xl font-bold text-white">Artifact workspace</h3>
                          <p className="text-sm text-slate-400">Filter, explore, and evolve the seeds that power this atlas.</p>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Data</span>
                            <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".csv,.tsv" className="hidden" />
                            <button
                              onClick={handleImportClick}
                              title="Import artifacts from CSV or TSV"
                              className="flex items-center gap-2 rounded-md bg-slate-700/60 px-3 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-600/70 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:ring-offset-2 focus:ring-offset-slate-900"
                            >
                              <ArrowUpTrayIcon className="h-5 w-5" />
                              Import
                            </button>
                            <label htmlFor="artifact-export-select" className="sr-only">Export artifacts</label>
                            <select
                              id="artifact-export-select"
                              onChange={handleExportOptionSelection}
                              defaultValue=""
                              className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                            >
                              <option value="">Export…</option>
                              <option value="export-csv">Artifacts (CSV)</option>
                              <option value="export-tsv">Artifacts (TSV)</option>
                              <option value="export-chapter-markdown">Chapter Bible (Markdown)</option>
                              <option value="export-chapter-pdf">Chapter Bible (PDF)</option>
                              <option value="export-lore-json">Lore Bundle (JSON)</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-3 rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">View</span>
                            <ViewSwitcher />
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setIsQuickFactModalOpen(true)}
                              className="flex items-center gap-2 rounded-md bg-slate-700/60 px-4 py-2 text-sm font-semibold text-slate-200 shadow-lg transition-colors hover:bg-slate-600/70 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={!selectedProject}
                              title={selectedProject ? 'Capture a tiny lore beat.' : 'Select a project to add a fact.'}
                            >
                              <SparklesIcon className="h-5 w-5" />
                              Add One Fact
                            </button>
                            <button
                              id="add-new-artifact-button"
                              onClick={() => openCreateArtifactModal()}
                              className="flex items-center gap-2 rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-cyan-500 hover:shadow-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-200/60 focus:ring-offset-2 focus:ring-offset-slate-900"
                            >
                              <PlusIcon className="h-5 w-5" />
                              New Seed
                            </button>
                          </div>
                        </div>
                      </header>
                      <div className="space-y-6">
                        <div className="bg-slate-900/40 border border-slate-700/50 rounded-lg px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <label htmlFor="artifact-type-filter" className="text-xs font-semibold uppercase tracking-wide text-slate-400">Type</label>
                                    <select
                                        id="artifact-type-filter"
                                        value={artifactTypeFilter}
                                        onChange={(event) => setArtifactTypeFilter(event.target.value as 'ALL' | ArtifactType)}
                                        className="bg-slate-800/80 border border-slate-700 rounded-md px-2 py-1 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    >
                                        <option value="ALL">All artifact types</option>
                                        {Object.values(ArtifactType).map((type) => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label htmlFor="artifact-status-filter" className="text-xs font-semibold uppercase tracking-wide text-slate-400">Stage</label>
                                    <select
                                        id="artifact-status-filter"
                                        value={statusFilter}
                                        onChange={(event) => setStatusFilter(event.target.value as 'ALL' | string)}
                                        className="bg-slate-800/80 border border-slate-700 rounded-md px-2 py-1 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    >
                                        <option value="ALL">All stages</option>
                                        {availableStatuses.map((status) => (
                                            <option key={status} value={status}>{formatStatusLabel(status)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label htmlFor="artifact-search" className="text-xs font-semibold uppercase tracking-wide text-slate-400">Search</label>
                                    <input
                                        id="artifact-search"
                                        type="search"
                                        value={searchTerm}
                                        onChange={(event) => setSearchTerm(event.target.value)}
                                        placeholder="Title, summary, or tag"
                                        className="bg-slate-800/80 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 w-48 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    />
                                </div>
                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={handleResetFilters}
                                        className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                                    >
                                        Clear filters
                                    </button>
                                )}
                                {availableTagFilters.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-2 w-full border-t border-slate-800/60 pt-2 mt-2">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tags</span>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                      {availableTagFilters.map((tag) => {
                                        const isActive = activeTagFilters.some((item) => item.toLowerCase() === tag.toLowerCase());
                                        return (
                                          <button
                                            key={tag.toLowerCase()}
                                            type="button"
                                            onClick={() => handleToggleTagFilter(tag)}
                                            aria-pressed={isActive}
                                            className={`rounded border px-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 ${
                                              isActive
                                                ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-200'
                                                : 'border-slate-700/70 bg-slate-800/60 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                                            }`}
                                          >
                                            {tag}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                            </div>
                            <div className="flex flex-col items-start gap-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:gap-4">
                                <RevealDepthToggle />
                                <span>
                                    Showing <span className="text-slate-200 font-semibold">{filteredArtifacts.length}</span> of <span className="text-slate-200 font-semibold">{projectArtifacts.length}</span> artifacts
                                </span>
                            </div>
                        </div>
                        {viewMode === 'table' && (
                            <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="border-b border-slate-700 bg-slate-800">
                                        <tr>
                                            <th className="p-3 text-sm font-semibold text-slate-300">Title</th>
                                            <th className="p-3 text-sm font-semibold text-slate-300">Type</th>
                                            <th className="p-3 text-sm font-semibold text-slate-300">Stage</th>
                                            <th className="p-3 text-sm font-semibold text-slate-300 hidden lg:table-cell">Summary</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredArtifacts.length > 0 ? (
                                            filteredArtifacts.map(art => (
                                                <ArtifactListItem key={art.id} artifact={art} onSelect={setSelectedArtifactId} isSelected={art.id === selectedArtifactId} />
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="text-center p-8 text-slate-500">
                                                    {hasActiveFilters ? 'No artifacts match the current filters.' : 'No artifacts in this project yet. Create a new seed!'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {viewMode === 'graph' && <GraphView artifacts={filteredArtifacts} onNodeClick={setSelectedArtifactId} />}
                        {viewMode === 'kanban' && <KanbanBoard artifacts={filteredArtifacts} onUpdateArtifactData={handleUpdateArtifactData} />}
                        {selectedArtifact && (
                          <div className="space-y-8">
                              {filteredSelectedArtifactHidden && (
                                  <div className="bg-amber-900/40 border border-amber-700/60 text-amber-200 text-sm px-4 py-3 rounded-lg">
                                      This artifact is currently hidden by the active filters. Clear them to surface it in the list.
                                  </div>
                              )}
                              <ArtifactDetail
                                artifact={selectedArtifact}
                                projectArtifacts={projectArtifacts}
                                onUpdateArtifact={handleUpdateArtifact}
                                onAddRelation={handleAddRelation}
                                onRemoveRelation={handleRemoveRelation}
                                onDeleteArtifact={handleDeleteArtifact}
                                onDuplicateArtifact={handleDuplicateArtifact}
                                onNewArtifact={(sourceId) => {
                                  openCreateArtifactModal({ sourceId });
                                }}
                                addXp={addXp}
                              />
                              {selectedArtifact.type === ArtifactType.Conlang && (
                                  <ConlangLexiconEditor
                                      artifact={selectedArtifact}
                                      conlangName={selectedProject.title}
                                      onLexemesChange={(id, lexemes) => handleUpdateArtifactData(id, lexemes)}
                                      addXp={addXp}
                                  />
                              )}
                              {isNarrativeArtifactType(selectedArtifact.type) && (
                                  <StoryEditor
                                      artifact={selectedArtifact}
                                      onUpdateArtifactData={(id, scenes) => handleUpdateArtifactData(id, scenes)}
                                      projectArtifacts={projectArtifacts}
                                      onAddRelation={handleAddRelation}
                                      onRemoveRelation={handleRemoveRelation}
                                  />
                              )}
                              {selectedArtifact.type === ArtifactType.Character && (
                                  <CharacterEditor
                                      artifact={selectedArtifact}
                                      onUpdateArtifactData={(id, data) => handleUpdateArtifactData(id, data)}
                                      projectArtifacts={projectArtifacts}
                                      onAddRelation={handleAddRelation}
                                      onRemoveRelation={handleRemoveRelation}
                                  />
                              )}
                              {selectedArtifact.type === ArtifactType.Wiki && (
                                  <WikiEditor
                                      artifact={selectedArtifact}
                                      onUpdateArtifactData={(id, data) => handleUpdateArtifactData(id, data)}
                                      assistants={aiAssistants}
                                  />
                              )}
                              {selectedArtifact.type === ArtifactType.Location && (
                                  <LocationEditor
                                      artifact={selectedArtifact}
                                      onUpdateArtifactData={(id, data) => handleUpdateArtifactData(id, data)}
                                      projectArtifacts={projectArtifacts}
                                      onAddRelation={handleAddRelation}
                                      onRemoveRelation={handleRemoveRelation}
                                  />
                              )}
                              {selectedArtifact.type === ArtifactType.MagicSystem && (
                                  <MagicSystemBuilder
                                      artifact={selectedArtifact}
                                      onUpdateArtifactData={(id, data) => handleUpdateArtifactData(id, data)}
                                  />
                              )}
                              {selectedArtifact.type === ArtifactType.Task && (
                                  <TaskEditor
                                      artifact={selectedArtifact}
                                      onUpdateArtifactData={(id, data) => handleUpdateArtifactData(id, data)}
                                  />
                              )}
                              {selectedArtifact.type === ArtifactType.Timeline && (
                                  <TimelineEditor
                                      artifact={selectedArtifact}
                                      onUpdateArtifactData={(id, data) => handleUpdateArtifactData(id, data)}
                                  />
                              )}
                          </div>
                        )}
                      </div>
                    </section>
                  )}
                  {currentProjectVisibility.quickFactsPanel && (
                    <QuickFactsPanel
                      facts={quickFactPreview}
                      totalFacts={quickFacts.length}
                      projectTitle={selectedProject.title}
                      onSelectFact={setSelectedArtifactId}
                      onAddFact={() => setIsQuickFactModalOpen(true)}
                    />
                  )}
                </div>
              </section>

              <section className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-100">{PROJECT_FEATURE_GROUPS.analytics.title}</h2>
                  <p className="text-sm text-slate-400">{PROJECT_FEATURE_GROUPS.analytics.description}</p>
                </div>
                <div className="space-y-6">
                  {currentProjectVisibility.projectInsights && (
                    <ProjectInsights artifacts={projectArtifacts} />
                  )}
                  {currentProjectVisibility.aiCopilot && (
                    <div className="space-y-4">
                      {featuredAssistant && (
                        <div className="rounded-2xl border border-pink-500/40 bg-pink-500/10 p-4 text-sm text-pink-100 shadow-lg shadow-pink-900/10">
                          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-pink-200">
                            <IntelligenceLogo className="w-4 h-4" />
                            Atlas Intelligence spotlight
                          </p>
                          <p className="text-base font-semibold text-pink-50">{featuredAssistant.name}</p>
                          <p className="text-xs text-pink-100/80">{featuredAssistant.focus}</p>
                        </div>
                      )}
                      <AICopilotPanel assistants={aiAssistants} />
                    </div>
                  )}
                  {(currentProjectVisibility.narrativeHealth || currentProjectVisibility.continuityMonitor || currentProjectVisibility.worldSimulation) && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
                      {currentProjectVisibility.narrativeHealth && <NarrativeHealthPanel artifacts={projectArtifacts} />}
                      {currentProjectVisibility.continuityMonitor && <ContinuityMonitor artifacts={projectArtifacts} />}
                      {currentProjectVisibility.worldSimulation && (
                        <WorldSimulationPanel
                          artifacts={projectArtifacts}
                          allArtifacts={artifacts}
                          projectTitle={selectedProject.title}
                          onSelectArtifact={setSelectedArtifactId}
                        />
                      )}
                    </div>
                  )}
                  {currentProjectVisibility.inspirationDeck && (
                    <InspirationDeck
                      onCaptureCard={handleCaptureInspirationCard}
                      isCaptureDisabled={!selectedProjectId}
                    />
                  )}
                </div>
              </section>

              <section className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-100">{PROJECT_FEATURE_GROUPS.tracking.title}</h2>
                  <p className="text-sm text-slate-400">{PROJECT_FEATURE_GROUPS.tracking.description}</p>
                </div>
                <div className="space-y-6">
                  {currentProjectVisibility.memorySync && (
                    <MemorySyncPanel
                      conversations={projectConversations}
                      onStatusChange={handleMemoryStatusChange}
                    />
                  )}
                  {currentProjectVisibility.openTasks && (
                    <OpenTasksPanel
                      artifacts={projectArtifacts}
                      projectTitle={selectedProject.title}
                      onSelectTask={(taskId) => setSelectedArtifactId(taskId)}
                    />
                  )}
                  {currentProjectVisibility.narrativePipeline && (
                    <NarrativePipelineBoard artifacts={projectArtifacts} />
                  )}
                  {currentProjectVisibility.familyTreeTools && (
                    <FamilyTreeTools
                      artifacts={projectArtifacts}
                      onSelectCharacter={setSelectedArtifactId}
                      onCreateCharacter={() => openCreateArtifactModal({ defaultType: ArtifactType.Character })}
                    />
                  )}
                  {currentProjectVisibility.characterArcTracker && (
                    <CharacterArcTracker artifacts={projectArtifacts} />
                  )}
                  {currentProjectVisibility.milestoneTracker && (
                    <>
                      {upcomingMilestoneOverview && (
                        <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100 shadow-lg shadow-amber-900/10">
                          <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">Next milestone</p>
                          <p className="text-base font-semibold text-amber-50">{upcomingMilestoneOverview.milestone.title}</p>
                          <p className="text-xs text-amber-200/80">{upcomingMilestoneOverview.milestone.focus}</p>
                          <p className="text-xs text-amber-200/60">
                            {Math.round(upcomingMilestoneOverview.completion * 100)}% complete
                          </p>
                        </div>
                      )}
                      <MilestoneTracker items={milestoneProgress} />
                    </>
                  )}
                </div>
              </section>

              <section className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-100">{PROJECT_FEATURE_GROUPS.distribution.title}</h2>
                  <p className="text-sm text-slate-400">{PROJECT_FEATURE_GROUPS.distribution.description}</p>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
                    {currentProjectVisibility.templates && (
                      <div className="space-y-6 xl:col-span-2">
                        <ProjectTemplatePicker
                          templates={projectTemplates}
                          categories={templateLibrary}
                          activeProjectTitle={selectedProject.title}
                          onApplyTemplate={handleApplyProjectTemplate}
                          isApplyDisabled={!selectedProjectId}
                        />
                        <TemplateGallery
                          categories={templateLibrary}
                          projectTemplates={projectTemplates}
                          activeProjectTitle={selectedProject.title}
                          onSelectTemplate={handleSelectTemplate}
                        />
                      </div>
                    )}
                    {currentProjectVisibility.githubImport && (
                      <GitHubImportPanel
                          projectId={selectedProject.id}
                          ownerId={profile.uid}
                          existingArtifacts={projectArtifacts}
                          onArtifactsImported={handleGitHubArtifactsImported}
                          addXp={addXp}
                      />
                    )}
                    {currentProjectVisibility.releaseWorkflows && (
                      <div className="space-y-6 xl:col-span-2">
                        <ReleaseNotesGenerator
                            projectId={selectedProject.id}
                            projectTitle={selectedProject.title}
                            artifacts={projectArtifacts}
                            addXp={addXp}
                            onDraftGenerated={() => markSelectedProjectActivity({ generatedReleaseNotes: true })}
                        />
                        <section className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 space-y-4 shadow-lg shadow-slate-950/20">
                          <header className="space-y-1">
                            <h3 className="text-lg font-semibold text-slate-100">Publishing actions</h3>
                            <p className="text-sm text-slate-400">Ship updates whenever you are ready to share new lore.</p>
                          </header>
                          {selectedProjectPublishRecord ? (
                            <div className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 p-4 text-sm text-cyan-100">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex items-start gap-3">
                                  <GlobeAltIcon className="h-5 w-5 flex-shrink-0 text-cyan-200" />
                                  <div className="space-y-1">
                                    <p className="font-semibold text-cyan-100">Latest GitHub Pages site</p>
                                    <p className="text-xs text-cyan-100/80">
                                      {selectedProjectPublishRecord.repository}
                                      {selectedProjectPublishRecord.publishDirectory
                                        ? ` · ${selectedProjectPublishRecord.publishDirectory}`
                                        : ''}
                                      {lastPublishedAtLabel ? ` · Published ${lastPublishedAtLabel}` : ''}
                                    </p>
                                    <a
                                      href={selectedProjectPublishRecord.pagesUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block break-all text-xs font-medium text-cyan-50 underline"
                                    >
                                      {selectedProjectPublishRecord.pagesUrl}
                                    </a>
                                  </div>
                                </div>
                                <a
                                  href={selectedProjectPublishRecord.pagesUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 rounded-md border border-cyan-400/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-50 transition-colors hover:bg-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-cyan-200/60 focus:ring-offset-2 focus:ring-offset-slate-900"
                                >
                                  Visit live site
                                </a>
                              </div>
                            </div>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              onClick={handlePublish}
                              className="flex items-center gap-2 rounded-md bg-slate-700/60 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-600/70 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:ring-offset-2 focus:ring-offset-slate-900"
                            >
                              <BuildingStorefrontIcon className="h-5 w-5" />
                              Publish Site
                            </button>
                            <button
                              onClick={() => { void handlePublishToGithub(); }}
                              className="flex items-center gap-2 rounded-md bg-slate-700/60 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-600/70 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:ring-offset-2 focus:ring-offset-slate-900"
                            >
                              <GitHubIcon className="h-5 w-5" />
                              Publish to GitHub
                            </button>
                          </div>
                        </section>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </>
          ) : (
            <div className="flex items-center justify-center h-full bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
                <p className="text-slate-500">Select a project to view its artifacts.</p>
            </div>
          )}
        </section>
      </main>
      <Modal
        isOpen={isCreateModalOpen}
        onClose={closeCreateArtifactModal}
        title="Seed a New Artifact"
      >
        <CreateArtifactForm
          onCreate={handleCreateArtifact}
          onClose={closeCreateArtifactModal}
          sourceArtifactId={sourceArtifactId}
          defaultType={defaultCreateArtifactType ?? undefined}
        />
      </Modal>
      <Modal
        isOpen={isQuickFactModalOpen}
        onClose={() => {
          if (!isSavingQuickFact) {
            setIsQuickFactModalOpen(false);
          }
        }}
        title="Add One Fact"
      >
        <QuickFactForm
          projectTitle={selectedProject?.title ?? 'your world'}
          onSubmit={handleQuickFactSubmit}
          onCancel={() => {
            if (!isSavingQuickFact) {
              setIsQuickFactModalOpen(false);
            }
          }}
          isSubmitting={isSavingQuickFact}
        />
      </Modal>
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
      {infoModalContent && (
        <InfoModal
          isOpen={!!infoModalContent}
          onClose={() => setInfoModalContent(null)}
          title={infoModalContent.title}
          message={infoModalContent.message}
        />
      )}
      <PublishToGitHubModal
        isOpen={isPublishModalOpen}
        onClose={handleClosePublishModal}
        onPublish={handlePublishToGithubRepo}
        isPublishing={isPublishing}
        errorMessage={publishError}
        successInfo={publishSuccess}
        onResetStatus={handleResetPublishStatus}
        authStatus={githubAuthStatus}
        statusMessage={githubAuthMessage}
      />
      </div>
    </DepthPreferencesProvider>
  );
}

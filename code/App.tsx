import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
} from './types';
import { CubeIcon } from './components/Icons';
import Header from './components/Header';
import Modal from './components/Modal';
import CreateArtifactForm from './components/CreateArtifactForm';
import CreateProjectForm from './components/CreateProjectForm';
import { useUserData } from './contexts/UserDataContext';
import { useAuth } from './contexts/AuthContext';
import { achievements } from './src/data/achievements';
import { milestoneRoadmap } from './src/data/milestones';
import { questlines, selectDailyQuestsForDate } from './src/data/quests';
import { getCurrentDateKey } from './utils/date';
import {
  QUICK_FACT_TAG,
  deriveQuickFactTitle,
  createQuickFactSummary,
  createQuickFactContent,
  cloneArtifactData,
  isQuickFactArtifact,
} from './utils/quickFacts';
import {
  downloadProjectExport,
  importArtifactsViaApi,
  isDataApiConfigured,
} from './services/dataApi';
import ErrorBanner from './components/ErrorBanner';
import TutorialGuide from './components/TutorialGuide';
import ErrorBoundary from './components/ErrorBoundary';
import { createProjectActivity, evaluateMilestoneProgress, MilestoneProgressOverview, ProjectActivity } from './utils/milestoneProgress';
import InfoModal from './components/InfoModal';
import PublishToGitHubModal from './components/PublishToGitHubModal';
import QuickFactForm from './components/QuickFactForm';
import { DepthPreferencesProvider } from './contexts/DepthPreferencesContext';
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
import ProjectWorkspaceContainer from './components/ProjectWorkspaceContainer';
import WorkspaceSidebar from './components/WorkspaceSidebar';
import { getDefaultDataForType } from './utils/artifactDefaults';
import {
  exportProjectAsStaticSite,
  exportChapterBibleMarkdown,
  exportChapterBiblePdf,
  exportLoreJson,
} from './utils/export';
import { useGitHubPublish } from './hooks/useGitHubPublish';

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
  const dataApiEnabled = isDataApiConfigured && !isGuestMode;
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );
  const projectArtifacts = useMemo(
    () => artifacts.filter((artifact) => artifact.projectId === selectedProjectId),
    [artifacts, selectedProjectId],
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

  const handleImportArtifacts = useCallback(
    async (file: File) => {
      if (!selectedProjectId) {
        alert('Select a project before importing artifacts.');
        return;
      }

      if (!dataApiEnabled) {
        alert('Artifact import requires a connection to the data server.');
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
      }
    },
    [artifacts, dataApiEnabled, getIdToken, markSelectedProjectActivity, mergeArtifacts, selectedProjectId],
  );

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

  const handleStartGitHubPublish = useCallback(() => {
    if (!canPublishToGitHub) {
      alert('Publishing to GitHub requires a connection to the data server.');
      return;
    }
    void startGitHubAuthorization();
  }, [canPublishToGitHub, startGitHubAuthorization]);

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

  if (!profile) {
    return <DashboardShellPlaceholder loading={loading} />;
  }

  const xpProgress = profile.xp % 100;
  const level = Math.floor(profile.xp / 100) + 1;
  const isViewingOwnWorkspace = !selectedProject || selectedProject.ownerId === profile.uid;

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
        <WorkspaceSidebar
          profile={profile}
          level={level}
          isViewingOwnWorkspace={isViewingOwnWorkspace}
          onUpdateProfile={handleProfileUpdate}
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
          onSelectProject={handleSelectProject}
          selectedProjectHiddenByFilters={selectedProjectHiddenBySidebarFilters}
          canLoadMoreProjects={canLoadMoreProjects}
          isLoadingMoreProjects={isLoadingMoreProjects}
          onLoadMoreProjects={handleLoadMoreProjects}
          quests={todaysDailyQuests}
          questlines={questlines}
          claimedQuestlines={profile.questlinesClaimed}
          onClaimQuestline={handleQuestlineClaim}
          achievements={achievements}
          artifacts={artifacts}
        />

        <section className="lg:col-span-9 space-y-10">
          {selectedProject ? (
            <ProjectWorkspaceContainer
              profile={profile}
              project={selectedProject}
              projectArtifacts={projectArtifacts}
              allArtifacts={artifacts}
              level={level}
              xpProgress={xpProgress}
              selectedArtifactId={selectedArtifactId}
              onSelectArtifact={setSelectedArtifactId}
              onOpenCreateArtifactModal={openCreateArtifactModal}
              onOpenQuickFactModal={() => setIsQuickFactModalOpen(true)}
              onUpdateProject={handleUpdateProject}
              onDeleteProject={handleDeleteProject}
              visibilitySettings={currentProjectVisibility}
              onToggleVisibility={handleToggleComponentVisibility}
              onResetVisibility={handleResetComponentVisibility}
              onUpdateArtifact={handleUpdateArtifact}
              onUpdateArtifactData={handleUpdateArtifactData}
              onAddRelation={handleAddRelation}
              onRemoveRelation={handleRemoveRelation}
              onDeleteArtifact={handleDeleteArtifact}
              onDuplicateArtifact={handleDuplicateArtifact}
              onCaptureInspirationCard={handleCaptureInspirationCard}
              onApplyProjectTemplate={handleApplyProjectTemplate}
              onSelectTemplate={handleSelectTemplate}
              onGitHubArtifactsImported={handleGitHubArtifactsImported}
              onImportArtifacts={handleImportArtifacts}
              onExportArtifacts={handleExportArtifacts}
              onChapterBibleExport={handleChapterBibleExport}
              onLoreJsonExport={handleLoreJsonExport}
              onPublishProject={handlePublish}
              onStartGitHubPublish={handleStartGitHubPublish}
              publishHistoryRecord={selectedProjectPublishRecord}
              lastPublishedAtLabel={lastPublishedAtLabel}
              addXp={addXp}
              projectConversations={projectConversations}
              onMemoryStatusChange={handleMemoryStatusChange}
              markProjectActivity={markSelectedProjectActivity}
              milestoneProgress={milestoneProgress}
              upcomingMilestoneOverview={upcomingMilestoneOverview}
              canUseDataApi={canUseDataApi}
              canPublishToGitHub={canPublishToGitHub}
            />
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
        onClose={closePublishModal}
        onPublish={publishToRepository}
        isPublishing={isPublishing}
        errorMessage={publishError}
        successInfo={publishSuccess}
        onResetStatus={resetPublishStatus}
        authStatus={githubAuthStatus}
        statusMessage={githubAuthMessage}
      />
      </div>
    </DepthPreferencesProvider>
  );
}

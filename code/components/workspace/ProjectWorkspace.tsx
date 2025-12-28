import React, { useCallback, useEffect, useMemo, useState } from 'react';

import ProjectWorkspaceContainer from '../ProjectWorkspaceContainer';
import WorkspaceModals from './WorkspaceModals';
import {
  ArtifactNavigationController,
  CreateArtifactInput,
  InfoModalState,
  QuickFactInput,
  QuickFactModalOptions,
  WorkspaceView,
} from './types';
import { XMarkIcon } from '../Icons';

import {
  type Artifact,
  ArtifactType,
  type InspirationCard,
  type MemorySyncConversation,
  type MemorySyncStatus,
  type NpcMemoryRun,
  type Project,
  type ProjectActivity,
  type ProjectComponentKey,
  type ProjectTemplate,
  type ProjectVisibilitySettings,
  type AddRelationHandler,
  type Relation,
  type TemplateEntry,
  type UserProfile,
  type TaskData,
  TASK_STATE,
} from '../../types';
import {
  QUICK_FACT_TAG,
  cloneArtifactData,
  createQuickFactContent,
  createQuickFactSummary,
  deriveQuickFactTitle,
  isQuickFactArtifact,
} from '../../utils/quickFacts';
import { getDefaultDataForType } from '../../utils/artifactDefaults';
import {
  downloadProjectExport,
  importArtifactsViaApi,
  type ArtifactDraft,
} from '../../services/dataApi';
import {
  exportChapterBibleMarkdown,
  exportChapterBiblePdf,
  exportLoreJson,
  exportProjectAsStaticSite,
} from '../../utils/export';
import type { MilestoneProgressOverview } from '../../utils/milestoneProgress';
import type { ProjectPublishRecord } from '../../utils/publishHistory';
import { logAnalyticsEvent } from '../../services/analytics';
import { useToast } from '../../contexts/ToastContext';

interface ProjectWorkspaceProps {
  profile: UserProfile;
  project: Project;
  allProjects: Project[];
  projectArtifacts: Artifact[];
  allArtifacts: Artifact[];
  level: number;
  xpProgress: number;
  isZenMode: boolean;
  projectConversations: MemorySyncConversation[];
  projectNpcRuns: NpcMemoryRun[];
  onMemoryStatusChange: (conversationId: string, suggestionId: string, status: MemorySyncStatus) => void;
  milestoneProgress: MilestoneProgressOverview[];
  upcomingMilestoneOverview: MilestoneProgressOverview | null;
  publishHistoryRecord: ProjectPublishRecord | null;
  lastPublishedAtLabel: string | null;
  visibilitySettings: ProjectVisibilitySettings;
  onToggleVisibility: (component: ProjectComponentKey, isVisible: boolean) => void;
  onResetVisibility: () => void;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onDeleteProject: (projectId: string) => Promise<void> | void;
  onGitHubArtifactsImported: (artifacts: Artifact[]) => Promise<void> | void;
  markProjectActivity: (updates: Partial<ProjectActivity>) => void;
  addXp: (xp: number) => Promise<void> | void;
  createArtifact: (projectId: string, draft: ArtifactDraft) => Promise<Artifact | null>;
  createArtifactsBulk: (projectId: string, drafts: ArtifactDraft[]) => Promise<Artifact[]>;
  updateArtifact: (artifactId: string, updates: Partial<Artifact>) => Promise<Artifact | null>;
  deleteArtifact: (artifactId: string) => Promise<boolean>;
  mergeArtifacts: (projectId: string, artifacts: Artifact[]) => void;
  getIdToken: () => Promise<string | null>;
  canUseDataApi: boolean;
  canPublishToGitHub: boolean;
  onStartGitHubPublish: () => Promise<void>;
  onRegisterArtifactNavigator?: (navigator: ArtifactNavigationController | null) => void;
}

const DEFAULT_ARTIFACT_STATUS = 'idea';

const WORKSPACE_VIEW_OPTIONS: Array<{ id: WorkspaceView; label: string; description: string }> = [
  {
    id: 'codex',
    label: 'Codex',
    description: 'Browse artifacts, quick facts, and project stats.',
  },
  {
    id: 'board',
    label: 'Board',
    description: 'Track tasks, milestones, and relationship flows.',
  },
  {
    id: 'laboratory',
    label: 'Laboratory',
    description: 'Experiment with insights, AI copilots, and simulations.',
  },
  {
    id: 'studio',
    label: 'Studio',
    description: 'Prep templates, imports, and release workflows.',
  },
];

const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  profile,
  project,
  allProjects,
  projectArtifacts,
  allArtifacts,
  level,
  xpProgress,
  isZenMode,
  projectConversations,
  projectNpcRuns,
  onMemoryStatusChange,
  milestoneProgress,
  upcomingMilestoneOverview,
  publishHistoryRecord,
  lastPublishedAtLabel,
  visibilitySettings,
  onToggleVisibility,
  onResetVisibility,
  onUpdateProject,
  onDeleteProject,
  onGitHubArtifactsImported,
  markProjectActivity,
  addXp,
  createArtifact,
  createArtifactsBulk,
  updateArtifact,
  deleteArtifact,
  mergeArtifacts,
  getIdToken,
  canUseDataApi,
  canPublishToGitHub,
  onStartGitHubPublish,
  onRegisterArtifactNavigator,
}) => {
  const { showToast } = useToast();
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [defaultCreateArtifactType, setDefaultCreateArtifactType] = useState<ArtifactType | null>(null);
  const [sourceArtifactId, setSourceArtifactId] = useState<string | null>(null);
  const [isQuickFactModalOpen, setIsQuickFactModalOpen] = useState(false);
  const [isSavingQuickFact, setIsSavingQuickFact] = useState(false);
  const [infoModalContent, setInfoModalContent] = useState<InfoModalState>(null);
  const [workspaceErrorToast, setWorkspaceErrorToast] = useState<{ id: number; message: string } | null>(null);
  const [quickFactSourceArtifactId, setQuickFactSourceArtifactId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<WorkspaceView>('codex');

  const projectArtifactsById = useMemo(() => {
    const map = new Map<string, Artifact>();
    projectArtifacts.forEach((artifact) => {
      map.set(artifact.id, artifact);
    });
    return map;
  }, [projectArtifacts]);

  const quickFactSourceArtifact = useMemo(() => {
    if (!quickFactSourceArtifactId) {
      return null;
    }
    return projectArtifactsById.get(quickFactSourceArtifactId) ?? null;
  }, [projectArtifactsById, quickFactSourceArtifactId]);

  useEffect(() => {
    setSelectedArtifactId(null);
    setIsCreateModalOpen(false);
    setSourceArtifactId(null);
    setDefaultCreateArtifactType(null);
    setIsQuickFactModalOpen(false);
    setIsSavingQuickFact(false);
    setInfoModalContent(null);
    setWorkspaceErrorToast(null);
    setQuickFactSourceArtifactId(null);
    setCurrentView('codex');
  }, [project.id]);

  useEffect(() => {
    if (!workspaceErrorToast) {
      return undefined;
    }

    if (typeof window === 'undefined') {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setWorkspaceErrorToast(null);
    }, 6000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [workspaceErrorToast]);

  const handleWorkspaceError = useCallback((message: string) => {
    setWorkspaceErrorToast({ id: Date.now(), message });
    void logAnalyticsEvent('workspace_error', {
      project_id: project.id,
      severity: 'error',
      message_length: Math.min(message.length, 250),
    });
  }, [project.id]);

  const dismissWorkspaceError = useCallback(() => {
    setWorkspaceErrorToast(null);
  }, []);

  const openCreateArtifactModal = useCallback(
    ({ defaultType = null, sourceArtifactId: sourceId = null }: { defaultType?: ArtifactType | null; sourceArtifactId?: string | null } = {}) => {
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

  const triggerDownload = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const sanitizeRelationKind = useCallback((value: string) => value.trim().toUpperCase(), []);

  const getReciprocalRelationKind = useCallback(
    (kind: string): string => {
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
    },
    [sanitizeRelationKind],
  );

  const handleUpdateArtifactData = useCallback(
    (artifactId: string, data: Artifact['data']) => {
      const target = allArtifacts.find((artifact) => artifact.id === artifactId);
      if (!target) {
        return;
      }

      if (
        target.type === ArtifactType.Task &&
        data &&
        typeof data === 'object' &&
        (data as TaskData).state === TASK_STATE.Done &&
        (target.data as TaskData | undefined)?.state !== TASK_STATE.Done
      ) {
        void addXp(8);
      }

      void updateArtifact(artifactId, { data });
    },
    [addXp, allArtifacts, updateArtifact],
  );

  const handleUpdateArtifact = useCallback(
    (artifactId: string, updates: Partial<Artifact>) => {
      void updateArtifact(artifactId, updates);
    },
    [updateArtifact],
  );

  const handleAddRelation = useCallback<AddRelationHandler>(
    (fromId, toId, kind, options) => {
      const source = allArtifacts.find((artifact) => artifact.id === fromId);
      const target = allArtifacts.find((artifact) => artifact.id === toId);
      if (!source || !target) {
        return;
      }

      const normalizedKind = sanitizeRelationKind(kind);
      const reciprocalKind = getReciprocalRelationKind(normalizedKind);

      const newRelation: Relation = {
        toId,
        kind: normalizedKind,
        variantId: options?.variantId,
      };
      const reciprocalRelation: Relation = { toId: fromId, kind: reciprocalKind };

      const matchesSourceRelation = (relation: Relation) =>
        relation.toId === toId && relation.variantId === options?.variantId;

      const sourceHasRelation = source.relations.some(matchesSourceRelation);
      const nextSourceRelations = sourceHasRelation
        ? source.relations.map((relation) => (matchesSourceRelation(relation) ? newRelation : relation))
        : [...source.relations, newRelation];

      const shouldUpdateSource = sourceHasRelation
        ? source.relations.some(
            (relation) =>
              matchesSourceRelation(relation) && relation.kind !== normalizedKind,
          )
        : true;

      if (shouldUpdateSource) {
        void updateArtifact(fromId, { relations: nextSourceRelations });
      }

      const reciprocalExists = target.relations.some(
        (relation) => relation.toId === fromId && !relation.variantId,
      );
      const nextTargetRelations = reciprocalExists
        ? target.relations.map((relation) => (relation.toId === fromId ? reciprocalRelation : relation))
        : [...target.relations, reciprocalRelation];

      const shouldUpdateTarget = reciprocalExists
        ? target.relations.some((relation) => relation.toId === fromId && relation.kind !== reciprocalKind)
        : true;

      if (shouldUpdateTarget) {
        void updateArtifact(toId, { relations: nextTargetRelations });
      }
    },
    [allArtifacts, getReciprocalRelationKind, sanitizeRelationKind, updateArtifact],
  );

  const handleRemoveRelation = useCallback(
    (fromId: string, relationIndex: number) => {
      const source = allArtifacts.find((artifact) => artifact.id === fromId);
      if (!source) {
        return;
      }

      const relationToRemove = source.relations[relationIndex];
      if (!relationToRemove) {
        return;
      }

      const nextRelations = source.relations.filter((_, index) => index !== relationIndex);
      void updateArtifact(fromId, { relations: nextRelations });

      const target = allArtifacts.find((artifact) => artifact.id === relationToRemove.toId);
      if (!target) {
        return;
      }

      const nextTargetRelations = target.relations.filter((relation) => relation.toId !== fromId);
      if (nextTargetRelations.length !== target.relations.length) {
        void updateArtifact(relationToRemove.toId, { relations: nextTargetRelations });
      }
    },
    [allArtifacts, updateArtifact],
  );

  const handleDeleteArtifact = useCallback(
    async (artifactId: string) => {
      const success = await deleteArtifact(artifactId);
      if (!success) {
        showToast('Failed to delete artifact. Please try again later.', { variant: 'error' });
        return;
      }
      setSelectedArtifactId((current) => (current === artifactId ? null : current));
    },
    [deleteArtifact, showToast],
  );

  const handleDuplicateArtifact = useCallback(
    async (artifactId: string) => {
      const source = projectArtifactsById.get(artifactId);
      if (!source) {
        showToast('We could not find the artifact to duplicate.', { variant: 'error' });
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
      const draft: ArtifactDraft = {
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

      const created = await createArtifact(project.id, draft);
      if (!created) {
        showToast('We could not duplicate this artifact. Please try again later.', { variant: 'error' });
        return;
      }

      setSelectedArtifactId(created.id);
      void addXp(2);
      setInfoModalContent({
        title: 'Artifact duplicated',
        message: `Created ${created.title} from ${source.title}.`,
      });
    },
    [addXp, createArtifact, project.id, projectArtifacts, projectArtifactsById, showToast],
  );

  const handleCreateArtifact = useCallback(
    async ({ title, type, summary, sourceArtifactId: sourceId = null }: CreateArtifactInput) => {
      const data: Artifact['data'] = getDefaultDataForType(type, title);

      const created = await createArtifact(project.id, {
        type,
        title,
        summary,
        status: DEFAULT_ARTIFACT_STATUS,
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
    [addXp, closeCreateArtifactModal, createArtifact, handleAddRelation, project.id],
  );

  const handleApplyProjectTemplate = useCallback(
    async (template: ProjectTemplate) => {
      const projectArtifactsForSelection = projectArtifacts;
      const existingTitles = new Set(projectArtifactsForSelection.map((artifact) => artifact.title.toLowerCase()));
      const timestamp = Date.now();

      const drafts: ArtifactDraft[] = template.artifacts
        .filter((blueprint) => !existingTitles.has(blueprint.title.toLowerCase()))
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
        const created = await createArtifactsBulk(project.id, drafts);
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
        const selected = allProjects.find((candidate) => candidate.id === project.id);
        if (selected) {
          const mergedTags = Array.from(new Set([...selected.tags, ...template.projectTags]));
          if (mergedTags.length !== selected.tags.length) {
            onUpdateProject(project.id, { tags: mergedTags });
          }
        }
      }
    },
    [addXp, allProjects, createArtifactsBulk, onUpdateProject, project.id, projectArtifacts],
  );

  const handleSelectTemplate = useCallback(
    async (template: TemplateEntry) => {
      const data: Artifact['data'] = getDefaultDataForType(template.type, template.name);
      const created = await createArtifact(project.id, {
        type: template.type,
        title: template.name,
        summary: template.description,
        status: 'draft',
        tags: template.tags ?? [],
        relations: [],
        data,
      });

      if (created) {
        void addXp(2);
        setSelectedArtifactId(created.id);
      }
    },
    [addXp, createArtifact, project.id],
  );

  const handleImportArtifacts = useCallback(
    async (file: File) => {
      if (!canUseDataApi) {
        showToast('Artifact import requires a connection to the data server.', { variant: 'error' });
        return;
      }

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('Unable to authenticate the import request.');
        }

        const content = await file.text();
        const { artifacts: imported } = await importArtifactsViaApi(token, project.id, content);
        const existingIds = new Set(allArtifacts.map((artifact) => artifact.id));
        const newArtifacts = imported.filter((artifact) => !existingIds.has(artifact.id));

        if (newArtifacts.length > 0) {
          mergeArtifacts(project.id, newArtifacts);
          showToast(`${newArtifacts.length} new artifacts imported successfully!`, { variant: 'success' });
          markProjectActivity({ importedCsv: true });
        } else {
          showToast('No new artifacts to import. All IDs in the file already exist.', { variant: 'info' });
        }
      } catch (error) {
        console.error('Artifact import failed', error);
        showToast(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
          variant: 'error',
        });
      }
    },
    [
      allArtifacts,
      canUseDataApi,
      getIdToken,
      markProjectActivity,
      mergeArtifacts,
      project.id,
      showToast,
    ],
  );

  const handleExportArtifacts = useCallback(
    async (format: 'csv' | 'tsv') => {
      if (!canUseDataApi) {
        showToast('Artifact export requires a connection to the data server.', { variant: 'error' });
        return;
      }

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('Unable to authenticate the export request.');
        }

        const blob = await downloadProjectExport(token, project.id, format);
        const filename = `${project.title.replace(/\s+/g, '_').toLowerCase()}_artifacts.${format}`;
        triggerDownload(blob, filename);
        markProjectActivity({ exportedData: true });
      } catch (error) {
        console.error('Artifact export failed', error);
        showToast(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
          variant: 'error',
        });
      }
    },
    [
      canUseDataApi,
      getIdToken,
      markProjectActivity,
      project.id,
      project.title,
      showToast,
      triggerDownload,
    ],
  );

  const handleChapterBibleExport = useCallback(
    async (format: 'markdown' | 'pdf') => {
      if (projectArtifacts.length === 0) {
        showToast('Capture some lore before exporting a chapter bible.', { variant: 'info' });
        return;
      }

      try {
        if (format === 'markdown') {
          exportChapterBibleMarkdown(project, projectArtifacts);
        } else {
          await exportChapterBiblePdf(project, projectArtifacts);
        }
        markProjectActivity({ exportedData: true });
      } catch (error) {
        console.error('Chapter bible export failed', error);
        showToast('Unable to export the chapter bible right now. Please try again.', { variant: 'error' });
      }
    },
    [markProjectActivity, project, projectArtifacts, showToast],
  );

  const handleLoreJsonExport = useCallback(() => {
    if (projectArtifacts.length === 0) {
      showToast('Capture some lore before exporting a lore bundle.', { variant: 'info' });
      return;
    }

    try {
      exportLoreJson(project, projectArtifacts);
      markProjectActivity({ exportedData: true });
    } catch (error) {
      console.error('Lore JSON export failed', error);
      showToast('Unable to export lore JSON right now. Please try again.', { variant: 'error' });
    }
  }, [markProjectActivity, project, projectArtifacts, showToast]);

  const handlePublish = useCallback(() => {
    if (projectArtifacts.length === 0) {
      showToast('Capture some lore before publishing.', { variant: 'info' });
      return;
    }

    exportProjectAsStaticSite(project, projectArtifacts);
    markProjectActivity({ publishedSite: true });
    void addXp(25);
  }, [addXp, markProjectActivity, project, projectArtifacts, showToast]);

  const handleStartGitHubPublish = useCallback(() => {
    if (!canPublishToGitHub) {
      showToast('Publishing to GitHub requires a connection to the data server.', { variant: 'error' });
      return;
    }

    void onStartGitHubPublish();
  }, [canPublishToGitHub, onStartGitHubPublish, showToast]);

  const handleQuickFactSubmit = useCallback(
    async ({ fact, detail }: QuickFactInput) => {
      const trimmedFact = fact.trim();
      const trimmedDetail = detail?.trim();
      if (!trimmedFact) {
        throw new Error('Capture at least one sentence for your fact.');
      }

      setIsSavingQuickFact(true);

      try {
        const existingFactCount = projectArtifacts.filter(isQuickFactArtifact).length;
        const safeProjectTitle = project.title.trim().length > 0 ? project.title.trim() : 'Project';
        const fallbackTitle = `${safeProjectTitle} Fact #${existingFactCount + 1}`;
        const title = deriveQuickFactTitle(trimmedFact, fallbackTitle);
        const summary = createQuickFactSummary(trimmedFact, trimmedDetail);
        const content = createQuickFactContent(title, trimmedFact, trimmedDetail);

        const created = await createArtifact(project.id, {
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

        if (quickFactSourceArtifactId) {
          handleAddRelation(created.id, quickFactSourceArtifactId, 'RELATES_TO');
        }

        void addXp(3);
        setSelectedArtifactId(created.id);
        setIsQuickFactModalOpen(false);
        setQuickFactSourceArtifactId(null);
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
    [
      addXp,
      createArtifact,
      handleAddRelation,
      project.id,
      project.title,
      projectArtifacts,
      quickFactSourceArtifactId,
      setSelectedArtifactId,
    ],
  );

  const handleOpenQuickFactModal = useCallback(
    (options?: QuickFactModalOptions) => {
      setQuickFactSourceArtifactId(options?.sourceArtifactId ?? null);
      setIsQuickFactModalOpen(true);
    },
    [],
  );

  const handleCloseQuickFactModal = useCallback(() => {
    if (!isSavingQuickFact) {
      setIsQuickFactModalOpen(false);
      setQuickFactSourceArtifactId(null);
    }
  }, [isSavingQuickFact]);

  const handleDismissInfoModal = useCallback(() => {
    setInfoModalContent(null);
  }, []);

  const handleCaptureInspirationCard = useCallback(
    async (card: InspirationCard) => {
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

      const created = await createArtifact(project.id, {
        type: ArtifactType.Wiki,
        title,
        summary,
        status: DEFAULT_ARTIFACT_STATUS,
        tags: ['inspiration', suitTag, ...card.tags],
        relations: [],
        data: { content },
      });

      if (created) {
        void addXp(2);
        setSelectedArtifactId(created.id);
      }
    },
    [addXp, createArtifact, project.id],
  );

  return (
    <>
      {workspaceErrorToast ? (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm">
          <div className="flex items-start gap-3 rounded-lg border border-rose-500/40 bg-rose-500/90 px-4 py-3 text-sm text-rose-50 shadow-xl shadow-rose-900/40">
            <div className="flex-1 space-y-1">
              <p className="font-semibold">We hit a snag.</p>
              <p className="text-rose-50/90">{workspaceErrorToast.message}</p>
            </div>
            <button
              type="button"
              onClick={dismissWorkspaceError}
              className="rounded-md p-1 text-rose-100/80 transition-colors hover:text-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-200/80 focus:ring-offset-2 focus:ring-offset-rose-900"
              title="Dismiss error message"
            >
              <span className="sr-only">Dismiss error message</span>
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <section className="mb-10 space-y-3">
        <header className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">Workspace view</p>
          <p className="text-xs text-slate-500">Choose which tools to focus on while working in this project.</p>
        </header>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {WORKSPACE_VIEW_OPTIONS.map((option) => {
            const isActive = option.id === currentView;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setCurrentView(option.id)}
                aria-pressed={isActive}
                className={`rounded-2xl border px-4 py-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                  isActive
                    ? 'border-emerald-400/70 bg-emerald-500/10 shadow-lg shadow-emerald-900/20'
                    : 'border-slate-700/60 bg-slate-900/40 hover:border-slate-500/60'
                }`}
              >
                <span className={`text-base font-semibold ${isActive ? 'text-emerald-50' : 'text-slate-100'}`}>
                  {option.label}
                </span>
                <p className={`mt-1 text-sm ${isActive ? 'text-emerald-100/80' : 'text-slate-400'}`}>{option.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <ProjectWorkspaceContainer
        profile={profile}
        project={project}
        projectArtifacts={projectArtifacts}
        allArtifacts={allArtifacts}
        currentView={currentView}
        level={level}
        xpProgress={xpProgress}
        isZenMode={isZenMode}
        selectedArtifactId={selectedArtifactId}
        onSelectArtifact={setSelectedArtifactId}
        onOpenCreateArtifactModal={openCreateArtifactModal}
        onOpenQuickFactModal={handleOpenQuickFactModal}
        onUpdateProject={onUpdateProject}
        onDeleteProject={onDeleteProject}
        visibilitySettings={visibilitySettings}
        onToggleVisibility={onToggleVisibility}
        onResetVisibility={onResetVisibility}
        onUpdateArtifact={handleUpdateArtifact}
        onUpdateArtifactData={handleUpdateArtifactData}
        onAddRelation={handleAddRelation}
        onRemoveRelation={handleRemoveRelation}
        onDeleteArtifact={handleDeleteArtifact}
        onDuplicateArtifact={handleDuplicateArtifact}
        onCaptureInspirationCard={handleCaptureInspirationCard}
        onApplyProjectTemplate={handleApplyProjectTemplate}
        onSelectTemplate={handleSelectTemplate}
        onGitHubArtifactsImported={onGitHubArtifactsImported}
        onImportArtifacts={handleImportArtifacts}
        onExportArtifacts={handleExportArtifacts}
        onChapterBibleExport={handleChapterBibleExport}
        onLoreJsonExport={handleLoreJsonExport}
        onPublishProject={handlePublish}
        onStartGitHubPublish={handleStartGitHubPublish}
        publishHistoryRecord={publishHistoryRecord}
        lastPublishedAtLabel={lastPublishedAtLabel}
        addXp={addXp}
        projectConversations={projectConversations}
        projectNpcRuns={projectNpcRuns}
        onMemoryStatusChange={onMemoryStatusChange}
        markProjectActivity={markProjectActivity}
        milestoneProgress={milestoneProgress}
        upcomingMilestoneOverview={upcomingMilestoneOverview}
        canUseDataApi={canUseDataApi}
        canPublishToGitHub={canPublishToGitHub}
        onWorkspaceError={handleWorkspaceError}
        onRegisterArtifactNavigator={onRegisterArtifactNavigator}
      />

      <WorkspaceModals
        isCreateModalOpen={isCreateModalOpen}
        onCloseCreateModal={closeCreateArtifactModal}
        onCreateArtifact={handleCreateArtifact}
        sourceArtifactId={sourceArtifactId}
        defaultCreateArtifactType={defaultCreateArtifactType}
        isQuickFactModalOpen={isQuickFactModalOpen}
        onCloseQuickFactModal={handleCloseQuickFactModal}
        onSubmitQuickFact={handleQuickFactSubmit}
        onCancelQuickFact={handleCloseQuickFactModal}
        isSavingQuickFact={isSavingQuickFact}
        projectTitle={project.title}
        projectArtifacts={projectArtifacts}
        quickFactSourceArtifact={quickFactSourceArtifact}
        infoModalContent={infoModalContent}
        onDismissInfoModal={handleDismissInfoModal}
      />
    </>
  );
};

export default ProjectWorkspace;


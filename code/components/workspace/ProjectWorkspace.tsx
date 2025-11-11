import React, { useCallback, useEffect, useMemo, useState } from 'react';

import ProjectWorkspaceContainer from '../ProjectWorkspaceContainer';
import WorkspaceModals from './WorkspaceModals';
import { CreateArtifactInput, InfoModalState, QuickFactInput } from './types';

import {
  type Artifact,
  ArtifactType,
  type InspirationCard,
  type MemorySyncConversation,
  type MemorySyncStatus,
  type Project,
  type ProjectActivity,
  type ProjectComponentKey,
  type ProjectTemplate,
  type ProjectVisibilitySettings,
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

interface ProjectWorkspaceProps {
  profile: UserProfile;
  project: Project;
  allProjects: Project[];
  projectArtifacts: Artifact[];
  allArtifacts: Artifact[];
  level: number;
  xpProgress: number;
  projectConversations: MemorySyncConversation[];
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
}

const DEFAULT_ARTIFACT_STATUS = 'idea';

const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  profile,
  project,
  allProjects,
  projectArtifacts,
  allArtifacts,
  level,
  xpProgress,
  projectConversations,
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
}) => {
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [defaultCreateArtifactType, setDefaultCreateArtifactType] = useState<ArtifactType | null>(null);
  const [sourceArtifactId, setSourceArtifactId] = useState<string | null>(null);
  const [isQuickFactModalOpen, setIsQuickFactModalOpen] = useState(false);
  const [isSavingQuickFact, setIsSavingQuickFact] = useState(false);
  const [infoModalContent, setInfoModalContent] = useState<InfoModalState>(null);

  const projectArtifactsById = useMemo(() => {
    const map = new Map<string, Artifact>();
    projectArtifacts.forEach((artifact) => {
      map.set(artifact.id, artifact);
    });
    return map;
  }, [projectArtifacts]);

  useEffect(() => {
    setSelectedArtifactId(null);
    setIsCreateModalOpen(false);
    setSourceArtifactId(null);
    setDefaultCreateArtifactType(null);
    setIsQuickFactModalOpen(false);
    setIsSavingQuickFact(false);
    setInfoModalContent(null);
  }, [project.id]);

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

  const handleAddRelation = useCallback(
    (fromId: string, toId: string, kind: string) => {
      const source = allArtifacts.find((artifact) => artifact.id === fromId);
      const target = allArtifacts.find((artifact) => artifact.id === toId);
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
        ? source.relations.some((relation) => relation.toId === toId && relation.kind !== normalizedKind)
        : true;

      if (shouldUpdateSource) {
        void updateArtifact(fromId, { relations: nextSourceRelations });
      }

      const reciprocalExists = target.relations.some((relation) => relation.toId === fromId);
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
        alert('Failed to delete artifact. Please try again later.');
        return;
      }
      setSelectedArtifactId((current) => (current === artifactId ? null : current));
    },
    [deleteArtifact],
  );

  const handleDuplicateArtifact = useCallback(
    async (artifactId: string) => {
      const source = projectArtifactsById.get(artifactId);
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
    [addXp, createArtifact, project.id, projectArtifacts, projectArtifactsById],
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
        alert('Artifact import requires a connection to the data server.');
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
          alert(`${newArtifacts.length} new artifacts imported successfully!`);
          markProjectActivity({ importedCsv: true });
        } else {
          alert('No new artifacts to import. All IDs in the file already exist.');
        }
      } catch (error) {
        console.error('Artifact import failed', error);
        alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    [allArtifacts, canUseDataApi, getIdToken, markProjectActivity, mergeArtifacts, project.id],
  );

  const handleExportArtifacts = useCallback(
    async (format: 'csv' | 'tsv') => {
      if (!canUseDataApi) {
        alert('Artifact export requires a connection to the data server.');
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
        alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    [canUseDataApi, getIdToken, markProjectActivity, project.id, project.title, triggerDownload],
  );

  const handleChapterBibleExport = useCallback(
    async (format: 'markdown' | 'pdf') => {
      if (projectArtifacts.length === 0) {
        alert('Capture some lore before exporting a chapter bible.');
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
        alert('Unable to export the chapter bible right now. Please try again.');
      }
    },
    [markProjectActivity, project, projectArtifacts],
  );

  const handleLoreJsonExport = useCallback(() => {
    if (projectArtifacts.length === 0) {
      alert('Capture some lore before exporting a lore bundle.');
      return;
    }

    try {
      exportLoreJson(project, projectArtifacts);
      markProjectActivity({ exportedData: true });
    } catch (error) {
      console.error('Lore JSON export failed', error);
      alert('Unable to export lore JSON right now. Please try again.');
    }
  }, [markProjectActivity, project, projectArtifacts]);

  const handlePublish = useCallback(() => {
    if (projectArtifacts.length === 0) {
      alert('Capture some lore before publishing.');
      return;
    }

    exportProjectAsStaticSite(project, projectArtifacts);
    markProjectActivity({ publishedSite: true });
    void addXp(25);
  }, [addXp, markProjectActivity, project, projectArtifacts]);

  const handleStartGitHubPublish = useCallback(() => {
    if (!canPublishToGitHub) {
      alert('Publishing to GitHub requires a connection to the data server.');
      return;
    }

    void onStartGitHubPublish();
  }, [canPublishToGitHub, onStartGitHubPublish]);

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
    [addXp, createArtifact, project, projectArtifacts],
  );

  const handleCloseQuickFactModal = useCallback(() => {
    if (!isSavingQuickFact) {
      setIsQuickFactModalOpen(false);
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
      <ProjectWorkspaceContainer
        profile={profile}
        project={project}
        projectArtifacts={projectArtifacts}
        allArtifacts={allArtifacts}
        level={level}
        xpProgress={xpProgress}
        selectedArtifactId={selectedArtifactId}
        onSelectArtifact={setSelectedArtifactId}
        onOpenCreateArtifactModal={openCreateArtifactModal}
        onOpenQuickFactModal={() => setIsQuickFactModalOpen(true)}
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
        onMemoryStatusChange={onMemoryStatusChange}
        markProjectActivity={markProjectActivity}
        milestoneProgress={milestoneProgress}
        upcomingMilestoneOverview={upcomingMilestoneOverview}
        canUseDataApi={canUseDataApi}
        canPublishToGitHub={canPublishToGitHub}
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
        infoModalContent={infoModalContent}
        onDismissInfoModal={handleDismissInfoModal}
      />
    </>
  );
};

export default ProjectWorkspace;


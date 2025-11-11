import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  Artifact,
  ArtifactType,
  InspirationCard,
  MemorySyncConversation,
  MemorySyncStatus,
  Project,
  ProjectComponentKey,
  ProjectTemplate,
  TemplateEntry,
  UserProfile,
  type ProjectVisibilitySettings,
  isNarrativeArtifactType,
} from '../types';
import { PROJECT_FEATURE_GROUPS } from '../utils/projectVisibility';
import {
  getCompletedTaskCount,
  getConlangLexemeCount,
  getTotalRelations,
  getWikiWordCount,
} from '../utils/artifactMetrics';
import {
  isQuickFactArtifact,
  sortQuickFactsByRecency,
} from '../utils/quickFacts';
import { formatStatusLabel } from '../utils/status';
import {
  MilestoneProgressOverview,
  ProjectActivity,
} from '../utils/milestoneProgress';
import { ProjectPublishRecord } from '../utils/publishHistory';
import { useArtifactFilters } from '../hooks/useArtifactFilters';
import BackToTopButton from './BackToTopButton';
import WorkspaceActivityPanel from './workspace/WorkspaceActivityPanel';
import WorkspaceArtifactPanel from './workspace/WorkspaceArtifactPanel';
import WorkspaceHeroSection from './workspace/WorkspaceHeroSection';

interface ProjectWorkspaceContainerProps {
  profile: UserProfile;
  project: Project;
  projectArtifacts: Artifact[];
  allArtifacts: Artifact[];
  level: number;
  xpProgress: number;
  selectedArtifactId: string | null;
  onSelectArtifact: (artifactId: string | null) => void;
  onOpenCreateArtifactModal: (options?: { defaultType?: ArtifactType | null; sourceId?: string | null }) => void;
  onOpenQuickFactModal: () => void;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onDeleteProject: (projectId: string) => Promise<void> | void;
  visibilitySettings: ProjectVisibilitySettings;
  onToggleVisibility: (component: ProjectComponentKey, isVisible: boolean) => void;
  onResetVisibility: () => void;
  onUpdateArtifact: (artifactId: string, updates: Partial<Artifact>) => void;
  onUpdateArtifactData: (artifactId: string, data: Artifact['data']) => void;
  onAddRelation: (fromId: string, toId: string, kind: string) => void;
  onRemoveRelation: (fromId: string, relationIndex: number) => void;
  onDeleteArtifact: (artifactId: string) => Promise<void> | void;
  onDuplicateArtifact: (artifactId: string) => Promise<void> | void;
  onCaptureInspirationCard: (card: InspirationCard) => Promise<void> | void;
  onApplyProjectTemplate: (template: ProjectTemplate) => Promise<void> | void;
  onSelectTemplate: (template: TemplateEntry) => Promise<void> | void;
  onGitHubArtifactsImported: (artifacts: Artifact[]) => Promise<void> | void;
  onImportArtifacts: (file: File) => Promise<void>;
  onExportArtifacts: (format: 'csv' | 'tsv') => Promise<void>;
  onChapterBibleExport: (format: 'markdown' | 'pdf') => Promise<void>;
  onLoreJsonExport: () => void;
  onPublishProject: () => void;
  onStartGitHubPublish: () => Promise<void>;
  publishHistoryRecord: ProjectPublishRecord | null;
  lastPublishedAtLabel: string | null;
  addXp: (xp: number) => Promise<void> | void;
  projectConversations: MemorySyncConversation[];
  onMemoryStatusChange: (conversationId: string, suggestionId: string, status: MemorySyncStatus) => void;
  markProjectActivity: (updates: Partial<ProjectActivity>) => void;
  milestoneProgress: MilestoneProgressOverview[];
  upcomingMilestoneOverview: MilestoneProgressOverview | null;
  canUseDataApi: boolean;
  canPublishToGitHub: boolean;
  onWorkspaceError: (message: string) => void;
}

type ProjectWorkspaceContainerComponent = React.FC<ProjectWorkspaceContainerProps>;

const ProjectWorkspaceContainer: ProjectWorkspaceContainerComponent = ({
  profile,
  project,
  projectArtifacts,
  allArtifacts,
  level,
  xpProgress,
  selectedArtifactId,
  onSelectArtifact,
  onOpenCreateArtifactModal,
  onOpenQuickFactModal,
  onUpdateProject,
  onDeleteProject,
  visibilitySettings,
  onToggleVisibility,
  onResetVisibility,
  onUpdateArtifact,
  onUpdateArtifactData,
  onAddRelation,
  onRemoveRelation,
  onDeleteArtifact,
  onDuplicateArtifact,
  onCaptureInspirationCard,
  onApplyProjectTemplate,
  onSelectTemplate,
  onGitHubArtifactsImported,
  onImportArtifacts,
  onExportArtifacts,
  onChapterBibleExport,
  onLoreJsonExport,
  onPublishProject,
  onStartGitHubPublish,
  publishHistoryRecord,
  lastPublishedAtLabel,
  addXp,
  projectConversations,
  onMemoryStatusChange,
  markProjectActivity,
  milestoneProgress,
  upcomingMilestoneOverview,
  canUseDataApi,
  canPublishToGitHub,
  onWorkspaceError,
}) => {
  const detailSectionRef = useRef<HTMLDivElement | null>(null);
  const previousSelectedArtifactIdRef = useRef<string | null>(null);

  const quickFacts = useMemo(
    () => projectArtifacts.filter(isQuickFactArtifact).slice().sort(sortQuickFactsByRecency),
    [projectArtifacts],
  );
  const quickFactPreview = useMemo(() => quickFacts.slice(0, 4), [quickFacts]);

  const projectHeroStats = useMemo(() => {
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
  }, [projectArtifacts, quickFacts]);

  const handleViewModeAnalytics = useCallback(
    (mode: 'table' | 'graph' | 'kanban') => {
      if (mode === 'graph') {
        markProjectActivity({ viewedGraph: true });
      }
      if (mode === 'kanban') {
        markProjectActivity({ viewedKanban: true });
      }
    },
    [markProjectActivity],
  );

  useEffect(() => {
    if (!selectedArtifactId) {
      previousSelectedArtifactIdRef.current = null;
      return;
    }

    if (previousSelectedArtifactIdRef.current === selectedArtifactId) {
      return;
    }

    previousSelectedArtifactIdRef.current = selectedArtifactId;

    if (typeof window === 'undefined') {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      detailSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [selectedArtifactId]);

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
    markProjectActivity({ usedSearch: true });
  }, [searchTerm, markProjectActivity]);

  useEffect(() => {
    if (artifactTypeFilter === 'ALL' && statusFilter === 'ALL') {
      return;
    }
    markProjectActivity({ usedFilters: true });
  }, [artifactTypeFilter, statusFilter, markProjectActivity]);

  const selectedArtifact = useMemo(
    () => projectArtifacts.find((artifact) => artifact.id === selectedArtifactId) ?? null,
    [projectArtifacts, selectedArtifactId],
  );

  const handleResetFilters = useCallback(() => {
    resetFilters();
  }, [resetFilters]);

  const handleToggleTagFilter = useCallback(
    (tag: string) => {
      toggleTagFilter(tag);
    },
    [toggleTagFilter],
  );

  return (
    <>
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">{PROJECT_FEATURE_GROUPS.summary.title}</h2>
          <p className="text-sm text-slate-400">{PROJECT_FEATURE_GROUPS.summary.description}</p>
        </div>
        <div className="space-y-6">
          <WorkspaceHeroSection
            project={project}
            projectHeroStats={projectHeroStats}
            quickFactPreview={quickFactPreview}
            totalQuickFacts={quickFacts.length}
            level={level}
            xpProgress={xpProgress}
            statusLabel={formatStatusLabel(project.status)}
            showProjectHero={visibilitySettings.projectHero}
            showProjectOverview={visibilitySettings.projectOverview}
            showQuickFactsPanel={visibilitySettings.quickFactsPanel}
            visibilitySettings={visibilitySettings}
            onOpenCreateArtifactModal={() => onOpenCreateArtifactModal()}
            onOpenQuickFactModal={onOpenQuickFactModal}
            onPublishProject={onPublishProject}
            onSelectArtifact={(artifactId) => onSelectArtifact(artifactId)}
            onUpdateProject={onUpdateProject}
            onDeleteProject={onDeleteProject}
            onToggleVisibility={onToggleVisibility}
            onResetVisibility={onResetVisibility}
          />
          <WorkspaceArtifactPanel
            featureGroup={PROJECT_FEATURE_GROUPS.summary}
            isVisible={visibilitySettings.artifactExplorer}
            project={project}
            allArtifacts={allArtifacts}
            projectArtifacts={projectArtifacts}
            filteredArtifacts={filteredArtifacts}
            quickFactPreview={quickFactPreview}
            totalQuickFacts={quickFacts.length}
            viewMode={viewMode}
            setViewMode={setViewMode}
            artifactTypeFilter={artifactTypeFilter}
            setArtifactTypeFilter={setArtifactTypeFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            availableStatuses={availableStatuses}
            availableTagFilters={availableTagFilters}
            activeTagFilters={activeTagFilters}
            hasActiveFilters={hasActiveFilters}
            onResetFilters={handleResetFilters}
            onToggleTagFilter={handleToggleTagFilter}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedArtifact={selectedArtifact}
            selectedArtifactId={selectedArtifactId}
            isSelectedArtifactHidden={isSelectedArtifactHidden(selectedArtifactId)}
            onSelectArtifact={onSelectArtifact}
            onOpenQuickFactModal={onOpenQuickFactModal}
            onOpenCreateArtifactModal={onOpenCreateArtifactModal}
            onUpdateArtifact={onUpdateArtifact}
            onUpdateArtifactData={onUpdateArtifactData}
            onDuplicateArtifact={onDuplicateArtifact}
            onDeleteArtifact={onDeleteArtifact}
            onAddRelation={onAddRelation}
            onRemoveRelation={onRemoveRelation}
            onImportArtifacts={onImportArtifacts}
            onExportArtifacts={onExportArtifacts}
            onChapterBibleExport={onChapterBibleExport}
            onLoreJsonExport={onLoreJsonExport}
            canUseDataApi={canUseDataApi}
            detailSectionRef={detailSectionRef}
            addXp={addXp}
            onWorkspaceError={onWorkspaceError}
          />
        </div>
      </section>

      <WorkspaceActivityPanel
        analyticsGroup={PROJECT_FEATURE_GROUPS.analytics}
        trackingGroup={PROJECT_FEATURE_GROUPS.tracking}
        distributionGroup={PROJECT_FEATURE_GROUPS.distribution}
        visibilitySettings={visibilitySettings}
        project={project}
        profile={profile}
        projectArtifacts={projectArtifacts}
        allArtifacts={allArtifacts}
        projectConversations={projectConversations}
        onMemoryStatusChange={onMemoryStatusChange}
        onCaptureInspirationCard={onCaptureInspirationCard}
        onSelectArtifact={onSelectArtifact}
        onOpenCreateArtifactModal={onOpenCreateArtifactModal}
        markProjectActivity={markProjectActivity}
        milestoneProgress={milestoneProgress}
        upcomingMilestoneOverview={upcomingMilestoneOverview}
        addXp={addXp}
        publishHistoryRecord={publishHistoryRecord}
        lastPublishedAtLabel={lastPublishedAtLabel}
        canPublishToGitHub={canPublishToGitHub}
        onPublishProject={onPublishProject}
        onStartGitHubPublish={onStartGitHubPublish}
        onGitHubArtifactsImported={onGitHubArtifactsImported}
        onApplyProjectTemplate={onApplyProjectTemplate}
        onSelectTemplate={onSelectTemplate}
      />

      <BackToTopButton />
    </>
  );
};

export default ProjectWorkspaceContainer;

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  Artifact,
  ArtifactType,
  InspirationCard,
  MemorySyncConversation,
  MemorySyncStatus,
  NpcMemoryRun,
  Project,
  ProjectComponentKey,
  ProjectTemplate,
  type AddRelationHandler,
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
import WorkspaceBoardView from './workspace/views/WorkspaceBoardView';
import WorkspaceLaboratoryView from './workspace/views/WorkspaceLaboratoryView';
import WorkspaceStudioView from './workspace/views/WorkspaceStudioView';
import WorkspaceSummarySection from './workspace/WorkspaceSummarySection';
import type {
  ArtifactNavigationController,
  QuickFactModalOptions,
  WorkspaceView,
} from './workspace/types';
import { logAnalyticsEvent } from '../services/analytics';
import { buildCharacterArcEvaluationMap } from '../utils/characterProgression';

interface ArtifactFiltersState {
  viewMode: 'table' | 'graph' | 'kanban';
  artifactTypeFilter: 'ALL' | ArtifactType;
  statusFilter: 'ALL' | string;
  activeTagFilters: string[];
  searchTerm: string;
}

interface ProjectWorkspaceContainerProps {
  profile: UserProfile;
  project: Project;
  projectArtifacts: Artifact[];
  allArtifacts: Artifact[];
  currentView: WorkspaceView;
  level: number;
  xpProgress: number;
  isZenMode: boolean;
  selectedArtifactId: string | null;
  onSelectArtifact: (artifactId: string | null) => void;
  onOpenCreateArtifactModal: (options?: { defaultType?: ArtifactType | null; sourceId?: string | null }) => void;
  onOpenQuickFactModal: (options?: QuickFactModalOptions) => void;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onDeleteProject: (projectId: string) => Promise<void> | void;
  visibilitySettings: ProjectVisibilitySettings;
  onToggleVisibility: (component: ProjectComponentKey, isVisible: boolean) => void;
  onResetVisibility: () => void;
  onUpdateArtifact: (artifactId: string, updates: Partial<Artifact>) => void;
  onUpdateArtifactData: (artifactId: string, data: Artifact['data']) => void;
  onAddRelation: AddRelationHandler;
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
  projectNpcRuns: NpcMemoryRun[];
  onMemoryStatusChange: (conversationId: string, suggestionId: string, status: MemorySyncStatus) => void;
  markProjectActivity: (updates: Partial<ProjectActivity>) => void;
  milestoneProgress: MilestoneProgressOverview[];
  upcomingMilestoneOverview: MilestoneProgressOverview | null;
  canUseDataApi: boolean;
  canPublishToGitHub: boolean;
  onWorkspaceError: (message: string) => void;
  onRegisterArtifactNavigator?: (navigator: ArtifactNavigationController | null) => void;
  initialArtifactFilters?: Partial<ArtifactFiltersState>;
  onArtifactFiltersChange?: (filters: ArtifactFiltersState) => void;
}

type ProjectWorkspaceContainerComponent = React.FC<ProjectWorkspaceContainerProps>;

const ProjectWorkspaceContainer: ProjectWorkspaceContainerComponent = ({
  profile,
  project,
  projectArtifacts,
  allArtifacts,
  currentView,
  level,
  xpProgress,
  isZenMode,
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
  projectNpcRuns,
  onMemoryStatusChange,
  markProjectActivity,
  milestoneProgress,
  upcomingMilestoneOverview,
  canUseDataApi,
  canPublishToGitHub,
  onWorkspaceError,
  onRegisterArtifactNavigator,
  initialArtifactFilters,
  onArtifactFiltersChange,
}) => {
  const detailSectionRef = useRef<HTMLDivElement | null>(null);
  const previousSelectedArtifactIdRef = useRef<string | null>(selectedArtifactId);

  const quickFacts = useMemo(
    () => projectArtifacts.filter(isQuickFactArtifact).slice().sort(sortQuickFactsByRecency),
    [projectArtifacts],
  );
  const quickFactPreview = useMemo(() => quickFacts.slice(0, 4), [quickFacts]);

  const characterProgressionMap = useMemo(
    () => buildCharacterArcEvaluationMap(projectArtifacts),
    [projectArtifacts],
  );

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
      void logAnalyticsEvent('workspace_view_mode_change', {
        project_id: project.id,
        view_mode: mode,
      });
      if (mode === 'graph') {
        markProjectActivity({ viewedGraph: true });
      }
      if (mode === 'kanban') {
        markProjectActivity({ viewedKanban: true });
      }
    },
    [markProjectActivity, project.id],
  );

  const {
    viewMode,
    setViewMode,
    artifactTypeFilter,
    setArtifactTypeFilter,
    statusFilter,
    setStatusFilter,
    filteredArtifacts,
    availableStatuses,
    availableTagFilters,
    activeTagFilters,
    hasActiveFilters,
    resetFilters,
    toggleTagFilter,
    searchTerm,
    setSearchTerm,
    isSelectedArtifactHidden,
  } = useArtifactFilters(projectArtifacts, {
    onViewModeChange: handleViewModeAnalytics,
    initialViewMode: initialArtifactFilters?.viewMode,
    initialArtifactTypeFilter: initialArtifactFilters?.artifactTypeFilter,
    initialStatusFilter: initialArtifactFilters?.statusFilter,
    initialSearchTerm: initialArtifactFilters?.searchTerm,
    initialTagFilters: initialArtifactFilters?.activeTagFilters,
  });

  useEffect(() => {
    if (!onArtifactFiltersChange) {
      return;
    }

    onArtifactFiltersChange({
      viewMode,
      artifactTypeFilter,
      statusFilter,
      activeTagFilters,
      searchTerm,
    });
  }, [
    activeTagFilters,
    artifactTypeFilter,
    onArtifactFiltersChange,
    searchTerm,
    statusFilter,
    viewMode,
  ]);

  const selectedArtifact = useMemo(
    () => projectArtifacts.find((artifact) => artifact.id === selectedArtifactId) ?? null,
    [projectArtifacts, selectedArtifactId],
  );

  const summaryFeatureGroup = PROJECT_FEATURE_GROUPS.summary;
  const analyticsFeatureGroup = PROJECT_FEATURE_GROUPS.analytics;
  const trackingFeatureGroup = PROJECT_FEATURE_GROUPS.tracking;
  const distributionFeatureGroup = PROJECT_FEATURE_GROUPS.distribution;

  const isCodexView = currentView === 'codex';
  const isBoardView = currentView === 'board';
  const isLaboratoryView = currentView === 'laboratory';
  const isStudioView = currentView === 'studio';

  const handleResetFilters = useCallback(() => {
    resetFilters();
  }, [resetFilters]);

  const handleToggleTagFilter = useCallback(
    (tag: string) => {
      toggleTagFilter(tag);
    },
    [toggleTagFilter],
  );

  const canShowFamilyTreeTools = useMemo(
    () => projectArtifacts.some((artifact) => artifact.type === ArtifactType.Character),
    [projectArtifacts],
  );

  const handleFocusArtifactType = useCallback(
    (type: ArtifactType) => {
      setArtifactTypeFilter(type);
      setViewMode('table');
      onSelectArtifact(null);
    },
    [onSelectArtifact, setArtifactTypeFilter, setViewMode],
  );

  const handleOpenArtifact = useCallback(
    (artifactId: string) => {
      onSelectArtifact(artifactId);
    },
    [onSelectArtifact],
  );

  const handleClearNavigatorFilters = useCallback(() => {
    resetFilters();
    setViewMode('table');
    onSelectArtifact(null);
  }, [onSelectArtifact, resetFilters, setViewMode]);

  const artifactNavigator = useMemo<ArtifactNavigationController>(
    () => ({
      focusType: handleFocusArtifactType,
      clearFilters: handleClearNavigatorFilters,
      openArtifact: handleOpenArtifact,
    }),
    [handleClearNavigatorFilters, handleFocusArtifactType, handleOpenArtifact],
  );

  useEffect(() => {
    if (!onRegisterArtifactNavigator) {
      return;
    }

    onRegisterArtifactNavigator(artifactNavigator);
    return () => {
      onRegisterArtifactNavigator(null);
    };
  }, [artifactNavigator, onRegisterArtifactNavigator]);

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

  return (
    <>
      {isCodexView ? (
        <div className="space-y-12">
          <WorkspaceSummarySection
            featureGroup={summaryFeatureGroup}
            heroSectionProps={{
              project,
              projectHeroStats,
              quickFactPreview,
              totalQuickFacts: quickFacts.length,
              level,
              xpProgress,
              isZenMode,
              statusLabel: formatStatusLabel(project.status),
              showProjectHero: visibilitySettings.projectHero,
              showQuickFactsPanel: visibilitySettings.quickFactsPanel,
              visibilitySettings,
              onOpenCreateArtifactModal: () => onOpenCreateArtifactModal(),
              onOpenQuickFactModal,
              onPublishProject,
              onSelectArtifact,
              onUpdateProject,
              onDeleteProject,
              onToggleVisibility,
              onResetVisibility,
            }}
            artifactPanelProps={{
              isVisible: visibilitySettings.artifactExplorer,
              project,
              allArtifacts,
              projectArtifacts,
              characterProgressionMap,
              filteredArtifacts,
              quickFactPreview,
              totalQuickFacts: quickFacts.length,
              viewMode,
              setViewMode,
              artifactTypeFilter,
              setArtifactTypeFilter,
              statusFilter,
              setStatusFilter,
              availableStatuses,
              availableTagFilters,
              activeTagFilters,
              hasActiveFilters,
              onResetFilters: handleResetFilters,
              onToggleTagFilter: handleToggleTagFilter,
              searchTerm,
              setSearchTerm,
              selectedArtifact,
              selectedArtifactId,
              isSelectedArtifactHidden: isSelectedArtifactHidden(selectedArtifactId),
              onSelectArtifact,
              onOpenQuickFactModal,
              onOpenCreateArtifactModal,
              onUpdateArtifact,
              onUpdateArtifactData,
              onDuplicateArtifact,
              onDeleteArtifact,
              onAddRelation,
              onRemoveRelation,
              onImportArtifacts,
              onExportArtifacts,
              onChapterBibleExport,
              onLoreJsonExport,
              canUseDataApi,
              detailSectionRef,
              addXp,
              onWorkspaceError,
            }}
          />
        </div>
      ) : null}

      {isLaboratoryView ? (
        <WorkspaceLaboratoryView
          featureGroup={analyticsFeatureGroup}
          visibilitySettings={visibilitySettings}
          project={project}
          projectArtifacts={projectArtifacts}
          allArtifacts={allArtifacts}
          projectNpcRuns={projectNpcRuns}
          onSelectArtifact={onSelectArtifact}
          onCaptureInspirationCard={onCaptureInspirationCard}
        />
      ) : null}

      {isBoardView ? (
        <WorkspaceBoardView
          featureGroup={trackingFeatureGroup}
          visibilitySettings={visibilitySettings}
          project={project}
          projectArtifacts={projectArtifacts}
          projectConversations={projectConversations}
          projectNpcRuns={projectNpcRuns}
          onMemoryStatusChange={onMemoryStatusChange}
          onSelectArtifact={onSelectArtifact}
          onOpenCreateArtifactModal={onOpenCreateArtifactModal}
          milestoneProgress={milestoneProgress}
          upcomingMilestoneOverview={upcomingMilestoneOverview}
          characterProgressionMap={characterProgressionMap}
          showFamilyTreeTools={canShowFamilyTreeTools}
        />
      ) : null}

      {isStudioView ? (
        <WorkspaceStudioView
          featureGroup={distributionFeatureGroup}
          visibilitySettings={visibilitySettings}
          project={project}
          profile={profile}
          projectArtifacts={projectArtifacts}
          addXp={addXp}
          publishHistoryRecord={publishHistoryRecord}
          lastPublishedAtLabel={lastPublishedAtLabel}
          canPublishToGitHub={canPublishToGitHub}
          onPublishProject={onPublishProject}
          onStartGitHubPublish={onStartGitHubPublish}
          onGitHubArtifactsImported={onGitHubArtifactsImported}
          onApplyProjectTemplate={onApplyProjectTemplate}
          onSelectTemplate={onSelectTemplate}
          markProjectActivity={markProjectActivity}
        />
      ) : null}

      <BackToTopButton />
    </>
  );

};

export default ProjectWorkspaceContainer;

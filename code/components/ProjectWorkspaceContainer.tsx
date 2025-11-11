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
import WorkspaceSummarySection from './workspace/WorkspaceSummarySection';

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

  const summaryFeatureGroup = PROJECT_FEATURE_GROUPS.summary;

return (
    <>
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
            statusLabel: formatStatusLabel(project.status),
            showProjectHero: visibilitySettings.projectHero,
            showProjectOverview: visibilitySettings.projectOverview,
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
      </div>

      <BackToTopButton />
    </>
  );
};

export default ProjectWorkspaceContainer;

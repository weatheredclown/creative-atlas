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
import ProjectHero from './ProjectHero';
import ProjectSharePanel from './ProjectSharePanel';
import ProjectOverview from './ProjectOverview';
import QuickFactsPanel from './QuickFactsPanel';
import ProjectInsights from './ProjectInsights';
import AICopilotPanel from './AICopilotPanel';
import MemorySyncPanel from './MemorySyncPanel';
import OpenTasksPanel from './OpenTasksPanel';
import NarrativePipelineBoard from './NarrativePipelineBoard';
import FamilyTreeTools from './FamilyTreeTools';
import CharacterArcTracker from './CharacterArcTracker';
import MilestoneTracker from './MilestoneTracker';
import GitHubImportPanel from './GitHubImportPanel';
import ReleaseNotesGenerator from './ReleaseNotesGenerator';
import TemplateGallery from './TemplateGallery';
import ProjectTemplatePicker from './ProjectTemplatePicker';
import InspirationDeck from './InspirationDeck';
import NarrativeHealthPanel from './NarrativeHealthPanel';
import ContinuityMonitor from './ContinuityMonitor';
import WorldSimulationPanel from './WorldSimulationPanel';
import ArtifactListItem from './ArtifactListItem';
import GraphView from './GraphView';
import KanbanBoard from './KanbanBoard';
import ArtifactDetail from './ArtifactDetail';
import ConlangLexiconEditor from './ConlangLexiconEditor';
import StoryEditor from './StoryEditor';
import CharacterEditor from './CharacterEditor';
import WikiEditor from './WikiEditor';
import LocationEditor from './LocationEditor';
import MagicSystemBuilder from './MagicSystemBuilder';
import TaskEditor from './TaskEditor';
import TimelineEditor from './TimelineEditor';
import RevealDepthToggle from './RevealDepthToggle';
import {
  ArrowUpTrayIcon,
  BuildingStorefrontIcon,
  GitHubIcon,
  GlobeAltIcon,
  PlusIcon,
  ShareIcon,
  SparklesIcon,
  TableCellsIcon,
  ViewColumnsIcon,
  IntelligenceLogo,
} from './Icons';
import { aiAssistants } from '../src/data/aiAssistants';
import { projectTemplates, templateLibrary } from '../src/data/templates';

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
}

type FileInputChangeEvent = React.ChangeEvent<HTMLInputElement>;

type ProjectWorkspaceContainerComponent = React.FC<ProjectWorkspaceContainerProps>;

const featuredAssistant = aiAssistants[0];

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
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const filteredSelectedArtifactHidden = isSelectedArtifactHidden(selectedArtifactId);

  const handleResetFilters = useCallback(() => {
    resetFilters();
  }, [resetFilters]);

  const handleToggleTagFilter = useCallback(
    (tag: string) => {
      toggleTagFilter(tag);
    },
    [toggleTagFilter],
  );

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (event: FileInputChangeEvent) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      try {
        await onImportArtifacts(file);
      } finally {
        event.target.value = '';
      }
    },
    [onImportArtifacts],
  );

  const handleExportOptionSelection = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;

      if (value === '') {
        return;
      }

      switch (value) {
        case 'export-csv':
          void onExportArtifacts('csv');
          break;
        case 'export-tsv':
          void onExportArtifacts('tsv');
          break;
        case 'export-chapter-markdown':
          void onChapterBibleExport('markdown');
          break;
        case 'export-chapter-pdf':
          void onChapterBibleExport('pdf');
          break;
        case 'export-lore-json':
          onLoreJsonExport();
          break;
        default:
          break;
      }

      event.target.value = '';
    },
    [onChapterBibleExport, onExportArtifacts, onLoreJsonExport],
  );

  const ViewSwitcher = useCallback(() => (
    <div className="flex items-center gap-1 p-1 bg-slate-700/50 rounded-lg">
      <button
        onClick={() => setViewMode('table')}
        className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-colors ${
          viewMode === 'table' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'
        }`}
        type="button"
      >
        <TableCellsIcon className="w-4 h-4" /> Table
      </button>
      <button
        onClick={() => setViewMode('graph')}
        className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-colors ${
          viewMode === 'graph' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'
        }`}
        type="button"
      >
        <ShareIcon className="w-4 h-4" /> Graph
      </button>
      <button
        onClick={() => setViewMode('kanban')}
        className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-colors ${
          viewMode === 'kanban' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'
        }`}
        type="button"
      >
        <ViewColumnsIcon className="w-4 h-4" /> Kanban
      </button>
    </div>
  ), [setViewMode, viewMode]);

  return (
    <>
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">{PROJECT_FEATURE_GROUPS.summary.title}</h2>
          <p className="text-sm text-slate-400">{PROJECT_FEATURE_GROUPS.summary.description}</p>
        </div>
        <div className="space-y-6">
          {visibilitySettings.projectHero && projectHeroStats ? (
            <ProjectHero
              project={project}
              stats={projectHeroStats}
              quickFacts={quickFactPreview}
              totalQuickFacts={quickFacts.length}
              statusLabel={formatStatusLabel(project.status)}
              onCreateArtifact={() => onOpenCreateArtifactModal()}
              onCaptureQuickFact={onOpenQuickFactModal}
              onPublishProject={onPublishProject}
              onSelectQuickFact={onSelectArtifact}
              level={level}
              xpProgress={xpProgress}
            />
          ) : null}
          <ProjectSharePanel project={project} />
          {visibilitySettings.projectOverview && (
            <ProjectOverview
              project={project}
              onUpdateProject={onUpdateProject}
              onDeleteProject={onDeleteProject}
              visibilitySettings={visibilitySettings}
              onToggleVisibility={onToggleVisibility}
              onResetVisibility={onResetVisibility}
            />
          )}
          {visibilitySettings.artifactExplorer && (
            <section className="space-y-6 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5 shadow-lg shadow-slate-950/20">
              <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-white">Artifact workspace</h3>
                  <p className="text-sm text-slate-400">Filter, explore, and evolve the seeds that power this atlas.</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Data</span>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".csv,.tsv"
                      className="hidden"
                    />
                    <button
                      onClick={handleImportClick}
                      title={canUseDataApi ? 'Import artifacts from CSV or TSV' : 'Connect the data server to import artifacts.'}
                      className="flex items-center gap-2 rounded-md bg-slate-700/60 px-3 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-600/70 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      disabled={!canUseDataApi}
                    >
                      <ArrowUpTrayIcon className="h-5 w-5" />
                      Import
                    </button>
                    <label htmlFor="artifact-export-select" className="sr-only">
                      Export artifacts
                    </label>
                    <select
                      id="artifact-export-select"
                      onChange={handleExportOptionSelection}
                      defaultValue=""
                      className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!canUseDataApi}
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
                      onClick={onOpenQuickFactModal}
                      className="flex items-center gap-2 rounded-md bg-slate-700/60 px-4 py-2 text-sm font-semibold text-slate-200 shadow-lg transition-colors hover:bg-slate-600/70 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                      title="Capture a tiny lore beat."
                    >
                      <SparklesIcon className="h-5 w-5" />
                      Add One Fact
                    </button>
                    <button
                      id="add-new-artifact-button"
                      onClick={() => onOpenCreateArtifactModal()}
                      className="flex items-center gap-2 rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-cyan-500 hover:shadow-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-200/60 focus:ring-offset-2 focus:ring-offset-slate-900"
                      type="button"
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
                      <label htmlFor="artifact-type-filter" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Type
                      </label>
                      <select
                        id="artifact-type-filter"
                        value={artifactTypeFilter}
                        onChange={(event) => setArtifactTypeFilter(event.target.value as 'ALL' | ArtifactType)}
                        className="bg-slate-800/80 border border-slate-700 rounded-md px-2 py-1 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="ALL">All artifact types</option>
                        {Object.values(ArtifactType).map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="artifact-status-filter" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Stage
                      </label>
                      <select
                        id="artifact-status-filter"
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value as 'ALL' | string)}
                        className="bg-slate-800/80 border border-slate-700 rounded-md px-2 py-1 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="ALL">All stages</option>
                        {availableStatuses.map((status) => (
                          <option key={status} value={status}>
                            {formatStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="artifact-search" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Search
                      </label>
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
                      Showing <span className="text-slate-200 font-semibold">{filteredArtifacts.length}</span> of{' '}
                      <span className="text-slate-200 font-semibold">{projectArtifacts.length}</span> artifacts
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
                          filteredArtifacts.map((artifact) => (
                            <ArtifactListItem
                              key={artifact.id}
                              artifact={artifact}
                              onSelect={onSelectArtifact}
                              isSelected={artifact.id === selectedArtifactId}
                            />
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="text-center p-8 text-slate-500">
                              {hasActiveFilters
                                ? 'No artifacts match the current filters.'
                                : 'No artifacts in this project yet. Create a new seed!'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                {viewMode === 'graph' && <GraphView artifacts={filteredArtifacts} onNodeClick={onSelectArtifact} />}
                {viewMode === 'kanban' && (
                  <KanbanBoard artifacts={filteredArtifacts} onUpdateArtifactData={onUpdateArtifactData} />
                )}
                {selectedArtifact && (
                  <div ref={detailSectionRef} className="space-y-8">
                    {filteredSelectedArtifactHidden && (
                      <div className="bg-amber-900/40 border border-amber-700/60 text-amber-200 text-sm px-4 py-3 rounded-lg">
                        This artifact is currently hidden by the active filters. Clear them to surface it in the list.
                      </div>
                    )}
                    <ArtifactDetail
                      artifact={selectedArtifact}
                      projectArtifacts={projectArtifacts}
                      onUpdateArtifact={onUpdateArtifact}
                      onAddRelation={onAddRelation}
                      onRemoveRelation={onRemoveRelation}
                      onDeleteArtifact={onDeleteArtifact}
                      onDuplicateArtifact={onDuplicateArtifact}
                      onNewArtifact={(sourceId) => {
                        onOpenCreateArtifactModal({ sourceId });
                      }}
                      addXp={addXp}
                    />
                    {selectedArtifact.type === ArtifactType.Conlang && (
                      <ConlangLexiconEditor
                        artifact={selectedArtifact}
                        conlangName={project.title}
                        onLexemesChange={(id, lexemes) => onUpdateArtifactData(id, lexemes)}
                        addXp={addXp}
                      />
                    )}
                    {isNarrativeArtifactType(selectedArtifact.type) && (
                      <StoryEditor
                        artifact={selectedArtifact}
                        onUpdateArtifactData={(id, scenes) => onUpdateArtifactData(id, scenes)}
                        projectArtifacts={projectArtifacts}
                        onAddRelation={onAddRelation}
                        onRemoveRelation={onRemoveRelation}
                      />
                    )}
                    {selectedArtifact.type === ArtifactType.Character && (
                      <CharacterEditor
                        artifact={selectedArtifact}
                        onUpdateArtifactData={(id, data) => onUpdateArtifactData(id, data)}
                        projectArtifacts={projectArtifacts}
                        onAddRelation={onAddRelation}
                        onRemoveRelation={onRemoveRelation}
                      />
                    )}
                    {selectedArtifact.type === ArtifactType.Wiki && (
                      <WikiEditor
                        artifact={selectedArtifact}
                        onUpdateArtifactData={(id, data) => onUpdateArtifactData(id, data)}
                        assistants={aiAssistants}
                      />
                    )}
                    {selectedArtifact.type === ArtifactType.Location && (
                      <LocationEditor
                        artifact={selectedArtifact}
                        onUpdateArtifactData={(id, data) => onUpdateArtifactData(id, data)}
                        projectArtifacts={projectArtifacts}
                        onAddRelation={onAddRelation}
                        onRemoveRelation={onRemoveRelation}
                      />
                    )}
                    {selectedArtifact.type === ArtifactType.MagicSystem && (
                      <MagicSystemBuilder
                        artifact={selectedArtifact}
                        onUpdateArtifactData={(id, data) => onUpdateArtifactData(id, data)}
                      />
                    )}
                    {selectedArtifact.type === ArtifactType.Task && (
                      <TaskEditor
                        artifact={selectedArtifact}
                        onUpdateArtifactData={(id, data) => onUpdateArtifactData(id, data)}
                      />
                    )}
                    {selectedArtifact.type === ArtifactType.Timeline && (
                      <TimelineEditor
                        artifact={selectedArtifact}
                        onUpdateArtifactData={(id, data) => onUpdateArtifactData(id, data)}
                      />
                    )}
                  </div>
                )}
              </div>
            </section>
          )}
          {visibilitySettings.quickFactsPanel && (
            <QuickFactsPanel
              facts={quickFactPreview}
              totalFacts={quickFacts.length}
              projectTitle={project.title}
              onSelectFact={onSelectArtifact}
              onAddFact={onOpenQuickFactModal}
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
          {visibilitySettings.projectInsights && <ProjectInsights artifacts={projectArtifacts} />}
          {visibilitySettings.aiCopilot && (
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
          {(visibilitySettings.narrativeHealth || visibilitySettings.continuityMonitor || visibilitySettings.worldSimulation) && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {visibilitySettings.narrativeHealth && <NarrativeHealthPanel artifacts={projectArtifacts} />}
              {visibilitySettings.continuityMonitor && <ContinuityMonitor artifacts={projectArtifacts} />}
              {visibilitySettings.worldSimulation && (
                <WorldSimulationPanel
                  artifacts={projectArtifacts}
                  allArtifacts={allArtifacts}
                  projectTitle={project.title}
                  onSelectArtifact={onSelectArtifact}
                />
              )}
            </div>
          )}
          {visibilitySettings.inspirationDeck && (
            <InspirationDeck
              onCaptureCard={onCaptureInspirationCard}
              isCaptureDisabled={false}
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
          {visibilitySettings.memorySync && (
            <MemorySyncPanel
              conversations={projectConversations}
              onStatusChange={onMemoryStatusChange}
            />
          )}
          {visibilitySettings.openTasks && (
            <OpenTasksPanel
              artifacts={projectArtifacts}
              projectTitle={project.title}
              onSelectTask={(taskId) => onSelectArtifact(taskId)}
            />
          )}
          {visibilitySettings.narrativePipeline && <NarrativePipelineBoard artifacts={projectArtifacts} />}
          {visibilitySettings.familyTreeTools && (
            <FamilyTreeTools
              artifacts={projectArtifacts}
              onSelectCharacter={onSelectArtifact}
              onCreateCharacter={() => onOpenCreateArtifactModal({ defaultType: ArtifactType.Character })}
            />
          )}
          {visibilitySettings.characterArcTracker && <CharacterArcTracker artifacts={projectArtifacts} />}
          {visibilitySettings.milestoneTracker && (
            <>
              {upcomingMilestoneOverview && (
                <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100 shadow-lg shadow-amber-900/10">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">Next milestone</p>
                  <p className="text-base font-semibold text-amber-50">{upcomingMilestoneOverview.milestone.title}</p>
                  <p className="text-xs text-amber-200/80">{upcomingMilestoneOverview.milestone.focus}</p>
                  <p className="text-xs text-amber-200/60">{Math.round(upcomingMilestoneOverview.completion * 100)}% complete</p>
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
            {visibilitySettings.templates && (
              <div className="space-y-6 xl:col-span-2">
                <ProjectTemplatePicker
                  templates={projectTemplates}
                  categories={templateLibrary}
                  activeProjectTitle={project.title}
                  onApplyTemplate={onApplyProjectTemplate}
                  isApplyDisabled={false}
                />
                <TemplateGallery
                  categories={templateLibrary}
                  projectTemplates={projectTemplates}
                  activeProjectTitle={project.title}
                  onSelectTemplate={onSelectTemplate}
                />
              </div>
            )}
            {visibilitySettings.githubImport && (
              <GitHubImportPanel
                projectId={project.id}
                ownerId={profile.uid}
                existingArtifacts={projectArtifacts}
                onArtifactsImported={onGitHubArtifactsImported}
                addXp={addXp}
              />
            )}
            {visibilitySettings.releaseWorkflows && (
              <div className="space-y-6 xl:col-span-2">
                <ReleaseNotesGenerator
                  projectId={project.id}
                  projectTitle={project.title}
                  artifacts={projectArtifacts}
                  addXp={addXp}
                  onDraftGenerated={() => markProjectActivity({ generatedReleaseNotes: true })}
                />
                <section className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 space-y-4 shadow-lg shadow-slate-950/20">
                  <header className="space-y-1">
                    <h3 className="text-lg font-semibold text-slate-100">Publishing actions</h3>
                    <p className="text-sm text-slate-400">Ship updates whenever you are ready to share new lore.</p>
                  </header>
                  {publishHistoryRecord ? (
                    <div className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 p-4 text-sm text-cyan-100">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <GlobeAltIcon className="h-5 w-5 flex-shrink-0 text-cyan-200" />
                          <div className="space-y-1">
                            <p className="font-semibold text-cyan-100">Latest GitHub Pages site</p>
                            <p className="text-xs text-cyan-100/80">
                              {publishHistoryRecord.repository}
                              {publishHistoryRecord.publishDirectory ? ` · ${publishHistoryRecord.publishDirectory}` : ''}
                              {lastPublishedAtLabel ? ` · Published ${lastPublishedAtLabel}` : ''}
                            </p>
                            <a
                              href={publishHistoryRecord.pagesUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block break-all text-xs font-medium text-cyan-50 underline"
                            >
                              {publishHistoryRecord.pagesUrl}
                            </a>
                          </div>
                        </div>
                        <a
                          href={publishHistoryRecord.pagesUrl}
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
                      onClick={onPublishProject}
                      className="flex items-center gap-2 rounded-md bg-slate-700/60 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-600/70 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:ring-offset-2 focus:ring-offset-slate-900"
                      type="button"
                    >
                      <BuildingStorefrontIcon className="h-5 w-5" />
                      Publish Site
                    </button>
                    <button
                      onClick={() => {
                        void onStartGitHubPublish();
                      }}
                      className="flex items-center gap-2 rounded-md bg-slate-700/60 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-600/70 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      disabled={!canPublishToGitHub}
                      title={canPublishToGitHub ? 'Publish to GitHub Pages' : 'Sign in and connect the data API to publish to GitHub.'}
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
  );
};

export default ProjectWorkspaceContainer;


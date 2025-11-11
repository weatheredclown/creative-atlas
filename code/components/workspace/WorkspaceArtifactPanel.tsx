import React, { useCallback, useRef } from 'react';

import ArtifactDetail from '../ArtifactDetail';
import ArtifactListItem from '../ArtifactListItem';
import CharacterEditor from '../CharacterEditor';
import ConlangLexiconEditor from '../ConlangLexiconEditor';
import ErrorBoundary, { type ErrorBoundaryFallbackProps } from '../ErrorBoundary';
import GraphView from '../GraphView';
import KanbanBoard from '../KanbanBoard';
import LocationEditor from '../LocationEditor';
import MagicSystemBuilder from '../MagicSystemBuilder';
import RevealDepthToggle from '../RevealDepthToggle';
import StoryEditor from '../StoryEditor';
import TaskEditor from '../TaskEditor';
import TimelineEditor from '../TimelineEditor';
import WikiEditor from '../WikiEditor';
import {
  ArrowUpTrayIcon,
  PlusIcon,
  ShareIcon,
  SparklesIcon,
  TableCellsIcon,
  ViewColumnsIcon,
} from '../Icons';
import {
  type Artifact,
  ArtifactType,
  type Project,
  isNarrativeArtifactType,
} from '../../types';
import { aiAssistants } from '../../src/data/aiAssistants';

interface FeatureGroupMetadata {
  title: string;
  description: string;
}

interface WorkspaceArtifactPanelProps {
  featureGroup: FeatureGroupMetadata;
  isVisible: boolean;
  project: Project;
  allArtifacts: Artifact[];
  projectArtifacts: Artifact[];
  filteredArtifacts: Artifact[];
  quickFactPreview: Artifact[];
  totalQuickFacts: number;
  viewMode: 'table' | 'graph' | 'kanban';
  setViewMode: (mode: 'table' | 'graph' | 'kanban') => void;
  artifactTypeFilter: 'ALL' | ArtifactType;
  setArtifactTypeFilter: (value: 'ALL' | ArtifactType) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  availableStatuses: string[];
  availableTagFilters: string[];
  activeTagFilters: string[];
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  onToggleTagFilter: (tag: string) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedArtifact: Artifact | null;
  selectedArtifactId: string | null;
  isSelectedArtifactHidden: boolean;
  onSelectArtifact: (artifactId: string | null) => void;
  onOpenQuickFactModal: () => void;
  onOpenCreateArtifactModal: (options?: { defaultType?: ArtifactType | null; sourceId?: string | null }) => void;
  onUpdateArtifact: (artifactId: string, updates: Partial<Artifact>) => void;
  onUpdateArtifactData: (artifactId: string, data: Artifact['data']) => void;
  onDuplicateArtifact: (artifactId: string) => Promise<void> | void;
  onDeleteArtifact: (artifactId: string) => Promise<void> | void;
  onAddRelation: (fromId: string, toId: string, kind: string) => void;
  onRemoveRelation: (fromId: string, relationIndex: number) => void;
  addXp: (xp: number) => Promise<void> | void;
  onImportArtifacts: (file: File) => Promise<void>;
  onExportArtifacts: (format: 'csv' | 'tsv') => Promise<void>;
  onChapterBibleExport: (format: 'markdown' | 'pdf') => Promise<void>;
  onLoreJsonExport: () => void;
  canUseDataApi: boolean;
  detailSectionRef: React.MutableRefObject<HTMLDivElement | null>;
  onWorkspaceError: (message: string) => void;
}

const WorkspaceArtifactPanel: React.FC<WorkspaceArtifactPanelProps> = ({
  featureGroup,
  isVisible,
  project,
  allArtifacts,
  projectArtifacts,
  filteredArtifacts,
  quickFactPreview,
  totalQuickFacts,
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
  onResetFilters,
  onToggleTagFilter,
  searchTerm,
  setSearchTerm,
  selectedArtifact,
  selectedArtifactId,
  isSelectedArtifactHidden,
  onSelectArtifact,
  onOpenQuickFactModal,
  onOpenCreateArtifactModal,
  onUpdateArtifact,
  onUpdateArtifactData,
  onDuplicateArtifact,
  onDeleteArtifact,
  onAddRelation,
  onRemoveRelation,
  addXp,
  onImportArtifacts,
  onExportArtifacts,
  onChapterBibleExport,
  onLoreJsonExport,
  canUseDataApi,
  detailSectionRef,
  onWorkspaceError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
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

  const ViewSwitcher: React.FC = () => (
    <div className="flex items-center gap-1 rounded-lg bg-slate-700/50 p-1">
      <button
        onClick={() => setViewMode('table')}
        className={`flex items-center gap-2 rounded-md px-3 py-1 text-sm transition-colors ${
          viewMode === 'table' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'
        }`}
        type="button"
      >
        <TableCellsIcon className="h-4 w-4" /> Table
      </button>
      <button
        onClick={() => setViewMode('graph')}
        className={`flex items-center gap-2 rounded-md px-3 py-1 text-sm transition-colors ${
          viewMode === 'graph' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'
        }`}
        type="button"
      >
        <ShareIcon className="h-4 w-4" /> Graph
      </button>
      <button
        onClick={() => setViewMode('kanban')}
        className={`flex items-center gap-2 rounded-md px-3 py-1 text-sm transition-colors ${
          viewMode === 'kanban' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'
        }`}
        type="button"
      >
        <ViewColumnsIcon className="h-4 w-4" /> Kanban
      </button>
    </div>
  );

  if (!isVisible) {
    return null;
  }

  return (
    <section className="space-y-6 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5 shadow-lg shadow-slate-950/20">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h3 className="text-2xl font-bold text-white">Artifact workspace</h3>
          <p className="text-sm text-slate-400">{featureGroup.description}</p>
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
              title={
                canUseDataApi ? 'Import artifacts from CSV or TSV' : 'Connect the data server to import artifacts.'
              }
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
        <div className="flex flex-col gap-3 rounded-lg border border-slate-700/50 bg-slate-900/40 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="artifact-type-filter" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Type
              </label>
              <select
                id="artifact-type-filter"
                value={artifactTypeFilter}
                onChange={(event) => setArtifactTypeFilter(event.target.value as 'ALL' | ArtifactType)}
                className="rounded-md border border-slate-700 bg-slate-800/80 px-2 py-1 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                Status
              </label>
              <select
                id="artifact-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-md border border-slate-700 bg-slate-800/80 px-2 py-1 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="ALL">All statuses</option>
                {availableStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
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
                placeholder="Search artifacts..."
                className="w-56 rounded-md border border-slate-700 bg-slate-800/80 px-2 py-1 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
          <RevealDepthToggle hasActiveFilters={hasActiveFilters} onResetFilters={onResetFilters} />
        </div>

        {availableTagFilters.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {availableTagFilters.map((tag) => {
              const normalized = tag.trim().toLowerCase();
              const isActive = activeTagFilters.includes(normalized);

              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onToggleTagFilter(tag)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
                    isActive
                      ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-100'
                      : 'border-slate-700/60 bg-slate-900/70 text-slate-300 hover:border-slate-500/70 hover:text-white'
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="space-y-6">
          {viewMode === 'table' ? (
            <div className="space-y-4">
              <div className="grid gap-3">
                {filteredArtifacts.map((artifact) => (
                  <ArtifactListItem
                    key={artifact.id}
                    artifact={artifact}
                    onSelect={() => onSelectArtifact(artifact.id)}
                    onDuplicate={() => onDuplicateArtifact(artifact.id)}
                    onDelete={() => onDeleteArtifact(artifact.id)}
                    onOpenCreateQuickFact={onOpenQuickFactModal}
                    onOpenCreateArtifact={() => onOpenCreateArtifactModal({ sourceId: artifact.id })}
                    quickFactPreview={quickFactPreview}
                    totalQuickFacts={totalQuickFacts}
                  />
                ))}
              </div>
              {filteredArtifacts.length === 0 ? (
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-6 text-center text-sm text-slate-400">
                  No artifacts match the current filters. Try adjusting your search or resetting filters.
                </div>
              ) : null}
            </div>
          ) : null}

          {viewMode === 'graph' ? (
            <GraphView
              artifacts={projectArtifacts}
              onSelectArtifact={onSelectArtifact}
              selectedArtifactId={selectedArtifactId}
            />
          ) : null}

          {viewMode === 'kanban' ? (
            <KanbanBoard artifacts={filteredArtifacts} onSelectArtifact={onSelectArtifact} />
          ) : null}
        </div>

        {selectedArtifact ? (
          <ErrorBoundary
            resetKeys={[selectedArtifact.id]}
            onError={() => {
              const artifactLabel = selectedArtifact.title?.trim().length
                ? selectedArtifact.title.trim()
                : 'this artifact';
              onWorkspaceError(
                `We couldn't render ${artifactLabel}. Try closing it or refreshing your workspace before editing again.`,
              );
            }}
            fallback={({ reset }: ErrorBoundaryFallbackProps) => {
              const artifactLabel = selectedArtifact.title?.trim().length
                ? selectedArtifact.title.trim()
                : 'this artifact';
              return (
                <div
                  ref={detailSectionRef}
                  className="space-y-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-rose-100"
                >
                  <div className="space-y-2">
                    <h4 className="text-lg font-semibold">We hit a snag while opening {artifactLabel}.</h4>
                    <p className="text-sm text-rose-100/80">
                      The rest of your workspace is safe. Try again or close this artifact before refreshing the page.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={reset}
                      className="rounded-md border border-rose-400/60 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-50 transition-colors hover:border-rose-300 hover:bg-rose-500/30"
                    >
                      Try again
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectArtifact(null)}
                      className="rounded-md border border-rose-400/30 px-4 py-2 text-sm font-semibold text-rose-100 transition-colors hover:border-rose-300/60 hover:text-rose-50"
                    >
                      Close artifact
                    </button>
                  </div>
                </div>
              );
            }}
          >
            <div ref={detailSectionRef} className="space-y-6 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6">
              {isSelectedArtifactHidden ? (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
                  This artifact is hidden by the current filters. Reset filters to keep it in view while editing.
                </div>
              ) : null}
              <ArtifactDetail
                project={project}
                artifact={selectedArtifact}
                allArtifacts={allArtifacts}
                onUpdate={onUpdateArtifact}
                onUpdateData={onUpdateArtifactData}
                onDuplicate={onDuplicateArtifact}
                onDelete={onDeleteArtifact}
                onAddRelation={onAddRelation}
                onRemoveRelation={onRemoveRelation}
                onClose={() => onSelectArtifact(null)}
              />
              {selectedArtifact.type === ArtifactType.Conlang ? (
                <ConlangLexiconEditor
                  artifact={selectedArtifact}
                  conlangName={project.title}
                  onLexemesChange={(id, lexemes) => onUpdateArtifactData(id, lexemes)}
                  addXp={addXp}
                />
              ) : null}
              {isNarrativeArtifactType(selectedArtifact.type) ? (
                <StoryEditor
                  artifact={selectedArtifact}
                  onUpdateArtifactData={(id, scenes) => onUpdateArtifactData(id, scenes)}
                  projectArtifacts={projectArtifacts}
                  onAddRelation={onAddRelation}
                  onRemoveRelation={onRemoveRelation}
                />
              ) : null}
              {selectedArtifact.type === ArtifactType.Character ? (
                <CharacterEditor
                  artifact={selectedArtifact}
                  onUpdateArtifactData={(id, data) => onUpdateArtifactData(id, data)}
                  projectArtifacts={projectArtifacts}
                  onAddRelation={onAddRelation}
                  onRemoveRelation={onRemoveRelation}
                />
              ) : null}
              {selectedArtifact.type === ArtifactType.Wiki ? (
                <WikiEditor
                  artifact={selectedArtifact}
                  onUpdateArtifactData={(id, data) => onUpdateArtifactData(id, data)}
                  assistants={aiAssistants}
                />
              ) : null}
              {selectedArtifact.type === ArtifactType.Location ? (
                <LocationEditor
                  artifact={selectedArtifact}
                  onUpdateArtifactData={(id, data) => onUpdateArtifactData(id, data)}
                  projectArtifacts={projectArtifacts}
                  onAddRelation={onAddRelation}
                  onRemoveRelation={onRemoveRelation}
                />
              ) : null}
              {selectedArtifact.type === ArtifactType.MagicSystem ? (
                <MagicSystemBuilder
                  artifact={selectedArtifact}
                  onUpdateArtifactData={(id, data) => onUpdateArtifactData(id, data)}
                />
              ) : null}
              {selectedArtifact.type === ArtifactType.Task ? (
                <TaskEditor
                  artifact={selectedArtifact}
                  onUpdateArtifactData={(id, data) => onUpdateArtifactData(id, data)}
                />
              ) : null}
              {selectedArtifact.type === ArtifactType.Timeline ? (
                <TimelineEditor
                  artifact={selectedArtifact}
                  onUpdateArtifactData={(id, data) => onUpdateArtifactData(id, data)}
                />
              ) : null}
            </div>
          </ErrorBoundary>
        ) : null}
      </div>
    </section>
  );
};

export default WorkspaceArtifactPanel;

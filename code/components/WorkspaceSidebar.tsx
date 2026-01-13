import React, { useMemo } from 'react';

import { Artifact, ArtifactType, Project, ProjectStatus } from '../types';
import { formatStatusLabel } from '../utils/status';
import ProjectCard from './ProjectCard';
import { BookOpenIcon, FolderPlusIcon, MapPinIcon, UserCircleIcon, Spinner } from './Icons';
import type { ArtifactNavigationController } from './workspace/types';

interface WorkspaceSidebarProps {
  onOpenCreateProjectModal: () => void;
  projectSearchTerm: string;
  onProjectSearchTermChange: (value: string) => void;
  projectStatusFilter: 'ALL' | ProjectStatus;
  onProjectStatusFilterChange: (value: 'ALL' | ProjectStatus) => void;
  hasProjectFilters: boolean;
  onResetProjectFilters: () => void;
  visibleProjects: Project[];
  allProjects: Project[];
  selectedProjectId: string | null;
  selectedProject: Project | null;
  onSelectProject: (projectId: string) => void;
  onExitProject: () => void;
  selectedProjectHiddenByFilters: boolean;
  canLoadMoreProjects: boolean;
  isLoadingMoreProjects: boolean;
  onLoadMoreProjects: () => Promise<void> | void;
  projectArtifacts: Artifact[];
  artifactNavigator: ArtifactNavigationController | null;
}

const STATUS_COLLECTIONS: Array<{ label: string; value: 'ALL' | ProjectStatus; description: string }> = [
  { label: 'All projects', value: 'ALL', description: 'Everything in your atlas' },
  { label: 'Active worlds', value: ProjectStatus.Active, description: 'Currently in production' },
  { label: 'Ideas', value: ProjectStatus.Idea, description: 'Explore spark boards' },
  { label: 'Paused worlds', value: ProjectStatus.Paused, description: 'Waiting for a reboot' },
];

const NAVIGATION_GROUPS: Array<{
  id: string;
  label: string;
  description: string;
  type: ArtifactType;
  Icon: React.ComponentType<{ className?: string }>;
  emptyLabel: string;
}> = [
  {
    id: 'chapters',
    label: 'Chapters',
    description: 'Outline major beats and track your manuscript pacing.',
    type: ArtifactType.Chapter,
    Icon: BookOpenIcon,
    emptyLabel: 'Add your first chapter from the artifact workspace to anchor the story arc.',
  },
  {
    id: 'characters',
    label: 'Characters',
    description: 'Keep the cast at your fingertips while drafting scenes.',
    type: ArtifactType.Character,
    Icon: UserCircleIcon,
    emptyLabel: 'No characters yet. Introduce your cast from the artifact workspace.',
  },
  {
    id: 'locations',
    label: 'Locations',
    description: 'Reference key settings and lore while planning scenes.',
    type: ArtifactType.Location,
    Icon: MapPinIcon,
    emptyLabel: 'Document important settings to unlock rich worldbuilding notes.',
  },
];

const sortArtifacts = (artifacts: Artifact[]): Artifact[] =>
  artifacts
    .slice()
    .sort((a, b) => (a.title ?? 'Untitled').localeCompare(b.title ?? 'Untitled'));

const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  onOpenCreateProjectModal,
  projectSearchTerm,
  onProjectSearchTermChange,
  projectStatusFilter,
  onProjectStatusFilterChange,
  hasProjectFilters,
  onResetProjectFilters,
  visibleProjects,
  allProjects,
  selectedProjectId,
  selectedProject,
  onSelectProject,
  onExitProject,
  selectedProjectHiddenByFilters,
  canLoadMoreProjects,
  isLoadingMoreProjects,
  onLoadMoreProjects,
  projectArtifacts,
  artifactNavigator,
}) => {
  const projectNavigationGroups = useMemo(
    () =>
      NAVIGATION_GROUPS.map((group) => ({
        ...group,
        artifacts: sortArtifacts(projectArtifacts.filter((artifact) => artifact.type === group.type)),
      })),
    [projectArtifacts],
  );

  if (selectedProject) {
    const statusLabel = formatStatusLabel(selectedProject.status);
    return (
      <aside className="lg:col-span-3 space-y-6" aria-label="Project navigation">
        <div className="space-y-4 rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5 shadow-inner shadow-slate-950/20">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Project</p>
              <h2 className="text-xl font-semibold text-white">{selectedProject.title}</h2>
              <p className="text-xs text-slate-400">{statusLabel}</p>
            </div>
            <button
              type="button"
              onClick={onExitProject}
              className="rounded-md border border-slate-600/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition-colors hover:border-slate-400/80 hover:text-white"
            >
              Back to Atlas
            </button>
          </div>
          {selectedProject.summary && (
            <p className="text-sm text-slate-300 line-clamp-4">{selectedProject.summary}</p>
          )}
          {selectedProjectHiddenByFilters && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              Current project is hidden in the project list filters.
            </div>
          )}
        </div>
        <div className="space-y-5">
          {projectNavigationGroups.map((group) => {
            const { Icon } = group;
            const canNavigate = Boolean(artifactNavigator);
            return (
              <section
                key={group.id}
                className="rounded-2xl border border-slate-800/60 bg-slate-950/60 p-4 shadow-lg shadow-slate-950/30"
                aria-labelledby={`${group.id}-label`}
              >
                <header className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-100" id={`${group.id}-label`}>
                      <Icon className="h-4 w-4 text-cyan-300" />
                      {group.label}
                      <span className="text-xs font-normal text-slate-400">({group.artifacts.length})</span>
                    </div>
                    <p className="text-xs text-slate-400">{group.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => artifactNavigator?.focusType(group.type)}
                    className="text-xs font-semibold text-cyan-300 hover:text-cyan-100 disabled:opacity-60"
                    disabled={!canNavigate}
                  >
                    View all
                  </button>
                </header>
                {group.artifacts.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-400">{group.emptyLabel}</p>
                ) : (
                  <ul className="mt-3 space-y-1">
                    {group.artifacts.slice(0, 5).map((artifact) => (
                      <li key={artifact.id}>
                        <button
                          type="button"
                          onClick={() => artifactNavigator?.openArtifact(artifact.id)}
                          className="w-full rounded-lg border border-transparent px-3 py-2 text-left text-sm text-slate-200 transition-colors hover:border-cyan-500/60 hover:bg-slate-900/70 disabled:opacity-60"
                          disabled={!canNavigate}
                        >
                          {artifact.title?.trim() || 'Untitled artifact'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {group.artifacts.length > 5 && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => artifactNavigator?.focusType(group.type)}
                      className="text-xs font-semibold text-cyan-300 hover:text-cyan-100 disabled:opacity-60"
                      disabled={!canNavigate}
                    >
                      View remaining {group.artifacts.length - 5}
                    </button>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </aside>
    );
  }

  return (
    <aside className="lg:col-span-3 space-y-6" aria-label="Atlas navigation">
      <div>
        <div className="mb-4 flex items-center justify-between px-2">
          <h2 className="text-lg font-semibold text-slate-300">Projects</h2>
          <button
            id="create-new-project-button"
            onClick={onOpenCreateProjectModal}
            className="flex items-center gap-1.5 rounded-md bg-cyan-900/50 px-3 py-1 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-800/50"
            title="Create New Project"
          >
            <FolderPlusIcon className="h-4 w-4" />
            New
          </button>
        </div>
        <div className="space-y-4">
          <div className="space-y-3 rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
            <div className="space-y-1">
              <label htmlFor="project-search" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Search
              </label>
              <input
                id="project-search"
                type="search"
                value={projectSearchTerm}
                onChange={(event) => onProjectSearchTermChange(event.target.value)}
                placeholder="Project name, summary, or tag"
                className="w-full rounded-md border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="project-status-filter" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Collections
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_COLLECTIONS.map((collection) => {
                  const isActive = collection.value === projectStatusFilter;
                  return (
                    <button
                      key={collection.value}
                      type="button"
                      onClick={() => onProjectStatusFilterChange(collection.value)}
                      className={`rounded-lg border px-3 py-2 text-left text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                        isActive
                          ? 'border-cyan-400/70 bg-cyan-500/10 text-cyan-100'
                          : 'border-slate-700/70 bg-slate-900/60 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <p className="font-semibold">{collection.label}</p>
                      <p className="text-[11px] text-slate-400">{collection.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                {hasProjectFilters
                  ? `Showing ${visibleProjects.length} of ${allProjects.length} projects`
                  : `${allProjects.length} project${allProjects.length === 1 ? '' : 's'} available`}
              </span>
              {hasProjectFilters && (
                <button
                  type="button"
                  onClick={onResetProjectFilters}
                  className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {selectedProjectHiddenByFilters && (
            <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              <p>The selected project is hidden by the current filters.</p>
              <button
                type="button"
                onClick={onResetProjectFilters}
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
                  onSelect={onSelectProject}
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
                  void onLoadMoreProjects();
                }}
                className="w-full flex justify-center items-center gap-2 rounded-md border border-cyan-800/50 bg-cyan-950/50 px-3 py-2 text-sm font-semibold text-cyan-200 transition-colors hover:bg-cyan-900/60 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoadingMoreProjects}
              >
                {isLoadingMoreProjects && <Spinner className="w-4 h-4 text-cyan-200" />}
                {isLoadingMoreProjects ? 'Loading more projects…' : 'Load more projects'}
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default WorkspaceSidebar;

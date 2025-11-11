import React, { useMemo } from 'react';

import {
  Achievement,
  Artifact,
  Project,
  ProjectStatus,
  Quest,
  Questline,
  UserProfile,
  TutorialLanguage,
} from '../types';
import { formatStatusLabel } from '../utils/status';
import UserProfileCard from './UserProfileCard';
import StreakTracker from './StreakTracker';
import ProjectCard from './ProjectCard';
import Quests from './Quests';
import QuestlineBoard from './QuestlineBoard';
import Achievements from './Achievements';
import { FolderPlusIcon } from './Icons';
import SupportContentPanel from './SupportContentPanel';
import { getSupportContent } from '../utils/supportContent';

interface WorkspaceSidebarProps {
  profile: UserProfile;
  level: number;
  isViewingOwnWorkspace: boolean;
  onUpdateProfile: (updates: { displayName?: string; settings?: Partial<UserProfile['settings']> }) => void;
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
  onSelectProject: (projectId: string) => void;
  selectedProjectHiddenByFilters: boolean;
  canLoadMoreProjects: boolean;
  isLoadingMoreProjects: boolean;
  onLoadMoreProjects: () => Promise<void> | void;
  quests: Quest[];
  questlines: Questline[];
  claimedQuestlines: string[];
  onClaimQuestline: (questlineId: string, xpReward: number) => void;
  achievements: Achievement[];
  artifacts: Artifact[];
  tutorialLanguage: TutorialLanguage;
  onStartTutorial: () => void;
}

const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  profile,
  level,
  isViewingOwnWorkspace,
  onUpdateProfile,
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
  onSelectProject,
  selectedProjectHiddenByFilters,
  canLoadMoreProjects,
  isLoadingMoreProjects,
  onLoadMoreProjects,
  quests,
  questlines,
  claimedQuestlines,
  onClaimQuestline,
  achievements,
  artifacts,
  tutorialLanguage,
  onStartTutorial,
}) => {
  const supportContent = useMemo(() => getSupportContent(tutorialLanguage), [tutorialLanguage]);

  return (
    <aside className="lg:col-span-3 space-y-6">
      {isViewingOwnWorkspace && (
        <UserProfileCard profile={profile} onUpdateProfile={onUpdateProfile} />
      )}
      <StreakTracker currentStreak={profile.streakCount} bestStreak={profile.bestStreak} level={level} />
      <div>
        <div className="flex justify-between items-center px-2 mb-4">
          <h2 className="text-lg font-semibold text-slate-300">Projects</h2>
          <button
            id="create-new-project-button"
            onClick={onOpenCreateProjectModal}
            title={supportContent.tooltips.createProject}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-cyan-300 bg-cyan-900/50 hover:bg-cyan-800/50 rounded-md transition-colors"
          >
            <FolderPlusIcon className="w-4 h-4" />
            New
          </button>
        </div>
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3 space-y-3">
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
                Status
              </label>
              <select
                id="project-status-filter"
                value={projectStatusFilter}
                onChange={(event) => onProjectStatusFilterChange(event.target.value as 'ALL' | ProjectStatus)}
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
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 space-y-2">
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
                <ProjectCard key={project.id} project={project} onSelect={onSelectProject} isSelected={project.id === selectedProjectId} />
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
                className="w-full px-3 py-2 text-sm font-semibold text-cyan-200 bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-800/50 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isLoadingMoreProjects}
                title={supportContent.tooltips.loadMoreProjects}
              >
                {isLoadingMoreProjects ? 'Loading more projects…' : 'Load more projects'}
              </button>
            )}
          </div>
        </div>
      </div>
      <Quests quests={quests} artifacts={artifacts} projects={allProjects} />
      <QuestlineBoard
        questlines={questlines}
        artifacts={artifacts}
        projects={allProjects}
        profile={profile}
        level={level}
        claimedQuestlines={claimedQuestlines}
        onClaim={onClaimQuestline}
      />
      <Achievements achievements={achievements} artifacts={artifacts} projects={allProjects} />
      <SupportContentPanel language={tutorialLanguage} onStartTutorial={onStartTutorial} />
    </aside>
  );
};

export default WorkspaceSidebar;

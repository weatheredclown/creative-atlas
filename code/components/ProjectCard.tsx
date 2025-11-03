
import React, { KeyboardEvent } from 'react';
import { Project, ProjectStatus } from '../types';
import { formatStatusLabel } from '../utils/status';

const statusBadgeClasses: Record<ProjectStatus, string> = {
  [ProjectStatus.Active]: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200',
  [ProjectStatus.Idea]: 'border-amber-400/40 bg-amber-500/15 text-amber-200',
  [ProjectStatus.Paused]: 'border-orange-400/40 bg-orange-500/15 text-orange-200',
  [ProjectStatus.Archived]: 'border-slate-500/40 bg-slate-600/20 text-slate-200',
};

const ProjectCard: React.FC<{ project: Project; onSelect: (id: string) => void; isSelected: boolean }> = ({
  project,
  onSelect,
  isSelected,
}) => {
  const statusLabel = formatStatusLabel(project.status);

  return (
    <div
      onClick={() => onSelect(project.id)}
      className={`group relative cursor-pointer rounded-lg border p-4 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 ${
        isSelected
          ? 'border-cyan-400/80 bg-slate-800/70 shadow-lg shadow-cyan-500/10 ring-2 ring-cyan-500/40'
          : 'border-slate-700/60 bg-slate-900/40 hover:border-slate-500/70 hover:bg-slate-800/50'
      }`}
      role="button"
      aria-pressed={isSelected}
      aria-label={`Select project ${project.title}`}
      data-selected={isSelected ? 'true' : undefined}
      tabIndex={0}
      title={project.summary}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(project.id);
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold leading-snug text-slate-100">{project.title}</h3>
          <p className="text-xs text-slate-400 line-clamp-2">{project.summary}</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClasses[project.status]}`}
          aria-label={`Status: ${statusLabel}`}
        >
          {statusLabel}
        </span>
      </div>
      {project.tags.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-slate-500">
            {project.tags.map((tag) => `#${tag}`).join(' ')}
          </p>
        </div>
      )}
    </div>
  );
};

export default ProjectCard;

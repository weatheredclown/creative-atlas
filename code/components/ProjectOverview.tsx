import React, { useEffect, useMemo, useState } from 'react';
import { Project, ProjectStatus } from '../types';
import { formatStatusLabel, getStatusClasses } from '../utils/status';
import { TagIcon, XMarkIcon } from './Icons';

interface ProjectOverviewProps {
  project: Project;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onDeleteProject: (projectId: string) => Promise<void> | void;
}

const statusOrder: ProjectStatus[] = [
  ProjectStatus.Idea,
  ProjectStatus.Active,
  ProjectStatus.Paused,
  ProjectStatus.Archived,
];

const ProjectOverview: React.FC<ProjectOverviewProps> = ({ project, onUpdateProject, onDeleteProject }) => {
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState(project.summary);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);

  useEffect(() => {
    setSummaryDraft(project.summary);
    setIsEditingSummary(false);
    setSummaryError(null);
    setTagInput('');
    setTagError(null);
  }, [project.id, project.summary]);

  const tagCount = useMemo(() => project.tags.length, [project.tags]);

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = event.target.value as ProjectStatus;
    if (nextStatus === project.status) return;
    onUpdateProject(project.id, { status: nextStatus });
  };

  const handleSummarySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = summaryDraft.trim();
    if (!trimmed) {
      setSummaryError('Summary cannot be empty.');
      return;
    }
    onUpdateProject(project.id, { summary: trimmed });
    setSummaryError(null);
    setIsEditingSummary(false);
  };

  const handleCancelSummary = () => {
    setSummaryDraft(project.summary);
    setSummaryError(null);
    setIsEditingSummary(false);
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) {
      setTagError('Enter a tag before adding it.');
      return;
    }

    const exists = project.tags.some((tag) => tag.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setTagError('That tag is already attached to this project.');
      return;
    }

    onUpdateProject(project.id, { tags: [...project.tags, trimmed] });
    setTagInput('');
    setTagError(null);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateProject(project.id, {
      tags: project.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const handleTagKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddTag();
    }
  };

  return (
    <section className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Project Overview</p>
          <h2 className="text-2xl font-bold text-white mt-1">{project.title}</h2>
          <p className="text-xs text-slate-500 mt-2 font-mono break-all">ID: {project.id}</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${getStatusClasses(project.status)}`}>
            {formatStatusLabel(project.status)}
          </span>
          <select
            value={project.status}
            onChange={handleStatusChange}
            className="bg-slate-800/80 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {statusOrder.map((status) => (
              <option key={status} value={status}>
                {formatStatusLabel(status)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              const confirmed = window.confirm(
                `Delete project "${project.title}"? This will also remove its artifacts.`,
              );
              if (!confirmed) {
                return;
              }
              void onDeleteProject(project.id);
            }}
            className="px-3 py-2 text-xs font-semibold text-rose-100 bg-rose-600/20 border border-rose-500/30 rounded-md hover:bg-rose-600/30 transition-colors"
          >
            Delete project
          </button>
        </div>
      </header>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Summary</h3>
          {!isEditingSummary && (
            <button
              type="button"
              onClick={() => setIsEditingSummary(true)}
              className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
            >
              Edit summary
            </button>
          )}
        </div>
        {isEditingSummary ? (
          <form className="space-y-3" onSubmit={handleSummarySubmit}>
            <textarea
              value={summaryDraft}
              onChange={(event) => {
                setSummaryDraft(event.target.value);
                if (summaryError) {
                  setSummaryError(null);
                }
              }}
              rows={3}
              className="w-full bg-slate-900/70 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            {summaryError && <p className="text-xs text-rose-300">{summaryError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors"
              >
                Save summary
              </button>
              <button
                type="button"
                onClick={handleCancelSummary}
                className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-slate-300 bg-slate-900/50 border border-slate-800 rounded-lg px-4 py-3">
            {project.summary || 'No summary yet. Add one to give collaborators context.'}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 uppercase tracking-wide">
          <TagIcon className="w-4 h-4 text-cyan-300" />
          Tags
          <span className="text-xs font-normal text-slate-500">({tagCount})</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-slate-800/60 border border-slate-700/60 rounded-full text-slate-200"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="text-slate-400 hover:text-rose-300"
                aria-label={`Remove ${tag}`}
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </span>
          ))}
          {project.tags.length === 0 && (
            <span className="text-xs text-slate-500">No tags yet. Add some to aid search and filtering.</span>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={tagInput}
            onChange={(event) => {
              setTagInput(event.target.value);
              if (tagError) {
                setTagError(null);
              }
            }}
            onKeyDown={handleTagKeyDown}
            placeholder="Add a project tag and press Enter"
            className="flex-1 bg-slate-900/70 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-4 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors"
          >
            Add tag
          </button>
        </div>
        {tagError && <p className="text-xs text-rose-300">{tagError}</p>}
      </div>
    </section>
  );
};

export default ProjectOverview;

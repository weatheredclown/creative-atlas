import React, { KeyboardEvent, useMemo } from 'react';

import type { Artifact } from '../types';
import { BookOpenIcon, PlusIcon, SparklesIcon, ArrowUpTrayIcon, XMarkIcon } from './Icons';
import { formatStatusLabel, getStatusClasses } from '../utils/status';
import { isQuickFactArtifact } from '../utils/quickFacts';

interface ArtifactListItemProps {
  artifact: Artifact;
  onSelect: () => void;
  onDuplicate: () => Promise<void> | void;
  onDelete: () => Promise<void> | void;
  onOpenCreateQuickFact: () => void;
  onOpenCreateArtifact: () => void;
  quickFactPreview: Artifact[];
  totalQuickFacts: number;
  isSelected: boolean;
}

const ArtifactListItem: React.FC<ArtifactListItemProps> = ({
  artifact,
  onSelect,
  onDuplicate,
  onDelete,
  onOpenCreateQuickFact,
  onOpenCreateArtifact,
  quickFactPreview,
  totalQuickFacts,
  isSelected,
}) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  };

  const relationCount = Array.isArray(artifact.relations) ? artifact.relations.length : 0;
  const tags = Array.isArray(artifact.tags) ? artifact.tags : [];

  const quickFactMatch = useMemo(
    () => quickFactPreview.find((fact) => fact.id === artifact.id),
    [artifact.id, quickFactPreview],
  );

  const isQuickFact = isQuickFactArtifact(artifact);
  const quickFactLabel = useMemo(() => {
    if (!isQuickFact) {
      return null;
    }
    if (quickFactMatch) {
      return 'Quick Fact Spotlight';
    }
    if (totalQuickFacts > 0) {
      return `Quick Facts (${totalQuickFacts})`;
    }
    return 'Quick Fact';
  }, [isQuickFact, quickFactMatch, totalQuickFacts]);

  const handleDuplicate = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    void onDuplicate();
  };

  const handleDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    void onDelete();
  };

  const handleOpenQuickFact = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onOpenCreateQuickFact();
  };

  const handleOpenArtifact = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onOpenCreateArtifact();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={`group rounded-xl border border-slate-800/70 bg-slate-900/70 p-4 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400/70 ${
        isSelected ? 'border-cyan-500/50 bg-cyan-900/20' : 'hover:border-slate-700 hover:bg-slate-800/70'
      }`}
      aria-pressed={isSelected}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <BookOpenIcon className="mt-1 h-6 w-6 text-cyan-400" />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-white">{artifact.title || 'Untitled artifact'}</h3>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${getStatusClasses(
                  artifact.status,
                )}`}
              >
                {formatStatusLabel(artifact.status)}
              </span>
              {quickFactLabel ? (
                <span className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-200">
                  {quickFactLabel}
                </span>
              ) : null}
            </div>
            <p className="text-xs uppercase tracking-wide text-slate-400">{artifact.type}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleOpenArtifact}
            className="inline-flex items-center gap-1 rounded-md border border-slate-700/60 px-2 py-1 text-xs font-semibold text-slate-200 transition-colors hover:border-cyan-400/60 hover:text-cyan-100"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            New
          </button>
          <button
            type="button"
            onClick={handleOpenQuickFact}
            className="inline-flex items-center gap-1 rounded-md border border-slate-700/60 px-2 py-1 text-xs font-semibold text-slate-200 transition-colors hover:border-violet-400/60 hover:text-violet-100"
          >
            <SparklesIcon className="h-3.5 w-3.5" />
            Quick Fact
          </button>
          <button
            type="button"
            onClick={handleDuplicate}
            className="inline-flex items-center gap-1 rounded-md border border-slate-700/60 px-2 py-1 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-500/60 hover:text-white"
          >
            <ArrowUpTrayIcon className="h-3.5 w-3.5" />
            Duplicate
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 px-2 py-1 text-xs font-semibold text-rose-200 transition-colors hover:border-rose-400 hover:text-rose-100"
          >
            <XMarkIcon className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      <p className="mt-3 line-clamp-3 text-sm text-slate-300">
        {artifact.summary || 'No summary yet. Select the artifact to start building its story.'}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
        {tags.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {tags.slice(0, 4).map((tag) => (
              <span key={tag} className="inline-flex items-center rounded-full bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-slate-200">
                #{tag}
              </span>
            ))}
            {tags.length > 4 ? <span className="text-[11px] text-slate-500">+{tags.length - 4} more</span> : null}
          </div>
        ) : (
          <span className="text-[11px] text-slate-500">No tags yet</span>
        )}
        <span className="ml-auto flex items-center gap-1 text-[11px] uppercase tracking-wide text-slate-500">
          <span>{relationCount}</span>
          <span>{relationCount === 1 ? 'Relation' : 'Relations'}</span>
        </span>
      </div>
    </div>
  );
};

export default ArtifactListItem;

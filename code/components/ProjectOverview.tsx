import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Project, ProjectStatus } from '../types';
import { formatStatusLabel, getStatusClasses } from '../utils/status';
import { SparklesIcon, TagIcon, XMarkIcon } from './Icons';
import ConfirmationModal from './ConfirmationModal';

interface ProjectOverviewProps {
  project: Project;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onDeleteProject: (projectId: string) => Promise<void> | void;
}

interface FactPrompt {
  id: string;
  category: string;
  prompt: string;
  spark: string;
}

const FACT_PROMPTS: readonly FactPrompt[] = [
  {
    id: 'leyline-beacon',
    category: 'Lore Hook',
    prompt: 'A dormant leyline beacon beneath the headquarters pulses once at dusk, hinting that old wards are waking up.',
    spark: 'Invite collaborators to investigate why the wards are reactivating.',
  },
  {
    id: 'clockwork-debt',
    category: 'Character Beat',
    prompt: 'One collaborator secretly owes the Clockwork Guild three favors, and the first repayment comes due tonight.',
    spark: 'Seed a character or quest artifact about the debt collector showing up early.',
  },
  {
    id: 'whisperwood-rumor',
    category: 'World Detail',
    prompt: 'Whisperwood birds fall silent near the northern ridge—a sure sign that a new rift is bleeding through.',
    spark: 'Capture a location update or quest to secure the ridge before it fractures.',
  },
  {
    id: 'artifact-glow',
    category: 'Prop Spotlight',
    prompt: 'An otherwise mundane artifact glows when placed beside conlang lexemes that share its root syllable.',
    spark: 'Link a lexicon entry to the artifact and explore why language activates it.',
  },
  {
    id: 'streak-charm',
    category: 'Player Perk',
    prompt: 'Maintaining a seven-day streak unlocks a charm that doubles XP from relation-building for one session.',
    spark: 'Add a milestone or quest celebrating the charm and who wields it.',
  },
  {
    id: 'map-eclipse',
    category: 'Visual Cue',
    prompt: 'An upcoming eclipse will tint the world map in copper light; any location tagged "eclipse-ready" gains bonus visibility.',
    spark: 'Tag assets that thrive during the eclipse and note who is preparing.',
  },
  {
    id: 'faction-overture',
    category: 'Diplomacy Move',
    prompt: 'A rival faction sends a peace overture encoded in a children\'s rhyme that only veteran players recognize.',
    spark: 'Draft a lore snippet or quest responding to the coded offer.',
  },
  {
    id: 'memory-orb',
    category: 'Relic Memory',
    prompt: 'A crystalline orb replays one pivotal choice differently every time someone touches it.',
    spark: 'Outline alternate beats for a key scene using the orb as catalyst.',
  },
];

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
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [factSuggestion, setFactSuggestion] = useState<FactPrompt | null>(null);
  const [factFeedback, setFactFeedback] = useState<string | null>(null);
  const [lastFactId, setLastFactId] = useState<string | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setSummaryDraft(project.summary);
    setIsEditingSummary(false);
    setSummaryError(null);
    setTagInput('');
    setTagError(null);
    setFactSuggestion(null);
    setFactFeedback(null);
    setLastFactId(null);
    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
  }, [project.id, project.summary]);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

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

  const pickRandomFactPrompt = (excludeId?: string): FactPrompt | null => {
    if (FACT_PROMPTS.length === 0) {
      return null;
    }
    if (!excludeId) {
      return FACT_PROMPTS[Math.floor(Math.random() * FACT_PROMPTS.length)];
    }
    const options = FACT_PROMPTS.filter((prompt) => prompt.id !== excludeId);
    const pool = options.length > 0 ? options : FACT_PROMPTS;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const resetFeedbackTimer = () => {
    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFactFeedback(null);
      feedbackTimeoutRef.current = null;
    }, 2400);
  };

  const handleGenerateFact = () => {
    const next = pickRandomFactPrompt(lastFactId ?? undefined);
    if (!next) {
      return;
    }
    setFactSuggestion(next);
    setLastFactId(next.id);
    setFactFeedback(null);
    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
  };

  const handleInsertFact = () => {
    if (!factSuggestion) {
      return;
    }

    setIsEditingSummary(true);
    setSummaryError(null);
    setSummaryDraft((previous) => {
      const trimmed = previous.trim();
      if (!trimmed) {
        return factSuggestion.prompt;
      }
      if (trimmed.includes(factSuggestion.prompt)) {
        return previous;
      }
      return `${previous.trimEnd()}\n\n${factSuggestion.prompt}`;
    });
    setFactFeedback('Added to summary draft');
    resetFeedbackTimer();
  };

  const handleCopyFact = async () => {
    if (!factSuggestion) {
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      setFactFeedback('Copy not supported—select the text and press Ctrl/Cmd + C');
      resetFeedbackTimer();
      return;
    }

    try {
      await navigator.clipboard.writeText(factSuggestion.prompt);
      setFactFeedback('Copied to clipboard');
    } catch (error) {
      console.warn('Unable to copy fact prompt', error);
      setFactFeedback('Copy failed—select the text and press Ctrl/Cmd + C');
    }
    resetFeedbackTimer();
  };

  const handleDismissFact = () => {
    setFactSuggestion(null);
    setFactFeedback(null);
    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
  };

  return (
    <>
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
            onClick={() => setIsDeleteConfirmVisible(true)}
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

      <div className="space-y-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-cyan-500/20 p-2 text-cyan-200">
              <SparklesIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">Need a starter fact?</p>
              <h3 className="text-sm font-semibold text-slate-200">Shuffle a prompt to kickstart your next detail.</h3>
              <p className="text-xs text-slate-400">
                These hooks pair well with quick facts, wiki entries, or a fast project summary update.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGenerateFact}
            className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-3 py-2 text-xs font-semibold text-cyan-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={FACT_PROMPTS.length === 0}
          >
            Shuffle prompt
          </button>
        </div>
        {factSuggestion ? (
          <div className="space-y-3 rounded-lg border border-cyan-500/30 bg-slate-900/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400">{factSuggestion.category}</p>
                <p className="text-sm font-semibold text-slate-100">{factSuggestion.prompt}</p>
              </div>
              <button
                type="button"
                onClick={handleDismissFact}
                className="text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Dismiss
              </button>
            </div>
            <p className="text-xs text-slate-400">Spark: {factSuggestion.spark}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleInsertFact}
                className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-900 transition-colors hover:bg-white"
              >
                Drop into summary
              </button>
              <button
                type="button"
                onClick={handleCopyFact}
                className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-400 hover:text-white"
              >
                Copy prompt
              </button>
            </div>
            {factFeedback && <p className="text-xs font-semibold text-emerald-300">{factFeedback}</p>}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-cyan-500/20 bg-slate-900/40 px-4 py-6 text-xs text-slate-400">
            Tap <span className="font-semibold text-cyan-200">Shuffle prompt</span> to reveal a lore beat you can capture without
            overthinking the full seed form.
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
      <ConfirmationModal
        isOpen={isDeleteConfirmVisible}
        onClose={() => setIsDeleteConfirmVisible(false)}
        onConfirm={() => {
          void onDeleteProject(project.id);
          setIsDeleteConfirmVisible(false);
        }}
        title="Delete Project"
        message={`Are you sure you want to delete the project "${project.title}"? This action will also remove all of its associated artifacts and cannot be undone.`}
      />
    </>
  );
};

export default ProjectOverview;

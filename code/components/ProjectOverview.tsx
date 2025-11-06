import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Project, ProjectComponentKey, ProjectStatus, ProjectVisibilitySettings } from '../types';
import { formatStatusLabel, getStatusClasses } from '../utils/status';
import { PlusIcon, SparklesIcon, TagIcon, XMarkIcon } from './Icons';
import ConfirmationModal from './ConfirmationModal';
import ProjectSettingsPanel from './ProjectSettingsPanel';

interface ProjectOverviewProps {
  project: Project;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onDeleteProject: (projectId: string) => Promise<void> | void;
  visibilitySettings: ProjectVisibilitySettings;
  onToggleVisibility: (component: ProjectComponentKey, isVisible: boolean) => void;
  onResetVisibility: () => void;
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

const ProjectOverview: React.FC<ProjectOverviewProps> = ({
  project,
  onUpdateProject,
  onDeleteProject,
  visibilitySettings,
  onToggleVisibility,
  onResetVisibility,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState(project.title);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [summaryDraft, setSummaryDraft] = useState(project.summary);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [factSuggestion, setFactSuggestion] = useState<FactPrompt | null>(null);
  const [factFeedback, setFactFeedback] = useState<string | null>(null);
  const [lastFactId, setLastFactId] = useState<string | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const tagInputRef = useRef<HTMLInputElement | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setTitleDraft(project.title);
    setSummaryDraft(project.summary);
    setIsSettingsOpen(false);
    setTitleError(null);
    setSummaryError(null);
    setTagInput('');
    setIsAddingTag(false);
    setTagError(null);
    setFactSuggestion(null);
    setFactFeedback(null);
    setLastFactId(null);
    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
  }, [project.id, project.summary, project.title]);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isSettingsOpen) {
      setTitleDraft(project.title);
      setSummaryDraft(project.summary);
      setTitleError(null);
      setSummaryError(null);
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        settingsPanelRef.current?.contains(target) ||
        settingsButtonRef.current?.contains(target)
      ) {
        return;
      }
      setIsSettingsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSettingsOpen, project.summary, project.title]);

  const tagCount = useMemo(() => project.tags.length, [project.tags]);

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = event.target.value as ProjectStatus;
    if (nextStatus === project.status) return;
    onUpdateProject(project.id, { status: nextStatus });
  };

  const handleSaveProjectDetails = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = titleDraft.trim();
    const trimmedSummary = summaryDraft.trim();

    let hasError = false;
    if (!trimmedTitle) {
      setTitleError('Project name cannot be empty.');
      hasError = true;
    }
    if (!trimmedSummary) {
      setSummaryError('Summary cannot be empty.');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    const updates: Partial<Project> = {};
    if (trimmedTitle !== project.title) {
      updates.title = trimmedTitle;
    }
    if (trimmedSummary !== project.summary) {
      updates.summary = trimmedSummary;
    }

    if (Object.keys(updates).length > 0) {
      onUpdateProject(project.id, updates);
    }

    setIsSettingsOpen(false);
  };

  const handleResetProjectDetails = () => {
    setTitleDraft(project.title);
    setSummaryDraft(project.summary);
    setTitleError(null);
    setSummaryError(null);
  };

  const handleStartAddingTag = () => {
    setIsAddingTag(true);
    setTagInput('');
    setTagError(null);
    window.setTimeout(() => {
      tagInputRef.current?.focus();
    }, 0);
  };

  const handleCancelAddTag = () => {
    setIsAddingTag(false);
    setTagInput('');
    setTagError(null);
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
    setIsAddingTag(false);
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
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancelAddTag();
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

    setIsSettingsOpen(true);
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
      <section className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 space-y-8">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Project Overview</p>
              <h2 className="mt-1 text-2xl font-bold text-white">{project.title}</h2>
              <p className="text-xs text-slate-500 mt-2 font-mono break-all">ID: {project.id}</p>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Summary</h3>
              <p className="text-sm text-slate-300 bg-slate-900/50 border border-slate-800 rounded-lg px-4 py-3">
                {project.summary || 'No summary yet. Add one to give collaborators context.'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-4 sm:items-end">
            <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
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
            <div className="relative w-full sm:w-auto">
              <button
                type="button"
                ref={settingsButtonRef}
                onClick={() => setIsSettingsOpen((current) => !current)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-600/60 bg-slate-800/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 focus:ring-offset-2 focus:ring-offset-slate-900"
                aria-expanded={isSettingsOpen}
                aria-haspopup="true"
              >
                Project settings
              </button>
              {isSettingsOpen ? (
                <div
                  ref={settingsPanelRef}
                  className="absolute left-1/2 top-full z-30 mt-3 w-screen max-w-3xl -translate-x-1/2 px-4 sm:px-0"
                >
                  <div className="space-y-6 rounded-2xl border border-slate-700/70 bg-slate-950/95 p-6 shadow-2xl shadow-slate-900/60 backdrop-blur">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-100">Project details</h3>
                      <form className="space-y-4" onSubmit={handleSaveProjectDetails}>
                        <div className="space-y-1.5">
                          <label htmlFor="project-title-input" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Project name
                          </label>
                          <input
                            id="project-title-input"
                            value={titleDraft}
                            onChange={(event) => {
                              setTitleDraft(event.target.value);
                              if (titleError) {
                                setTitleError(null);
                              }
                            }}
                            className="w-full rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          />
                          {titleError ? <p className="text-xs text-rose-300">{titleError}</p> : null}
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor="project-summary-input" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Summary
                          </label>
                          <textarea
                            id="project-summary-input"
                            value={summaryDraft}
                            onChange={(event) => {
                              setSummaryDraft(event.target.value);
                              if (summaryError) {
                                setSummaryError(null);
                              }
                            }}
                            rows={3}
                            className="w-full rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          />
                          {summaryError ? <p className="text-xs text-rose-300">{summaryError}</p> : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="submit"
                            className="inline-flex items-center gap-2 rounded-md bg-cyan-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-cyan-500"
                          >
                            Save changes
                          </button>
                          <button
                            type="button"
                            onClick={handleResetProjectDetails}
                            className="inline-flex items-center gap-2 rounded-md border border-slate-600/60 bg-slate-800/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition-colors hover:border-cyan-400/60 hover:text-cyan-200"
                          >
                            Reset form
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsSettingsOpen(false)}
                            className="inline-flex items-center gap-2 rounded-md border border-slate-700/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-300 transition-colors hover:text-white"
                          >
                            Close
                          </button>
                        </div>
                      </form>
                    </div>
                    <ProjectSettingsPanel
                      settings={visibilitySettings}
                      onToggle={onToggleVisibility}
                      onReset={onResetVisibility}
                      className="border-slate-800/70 bg-slate-900/80"
                    />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
        </header>

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
              Tap <span className="font-semibold text-cyan-200">Shuffle prompt</span> to reveal a lore beat you can capture without overthinking the full seed form.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
            <TagIcon className="w-4 h-4 text-cyan-300" />
            Tags
            <span className="text-xs font-normal text-slate-500">({tagCount})</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
            {project.tags.length === 0 && !isAddingTag && (
              <span className="text-xs text-slate-500">No tags yet. Add some to aid search and filtering.</span>
            )}
            {isAddingTag ? (
              <div className="flex items-center gap-2">
                <input
                  ref={tagInputRef}
                  type="text"
                  value={tagInput}
                  onChange={(event) => {
                    setTagInput(event.target.value);
                    if (tagError) {
                      setTagError(null);
                    }
                  }}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => {
                    if (!tagInput.trim()) {
                      handleCancelAddTag();
                    }
                  }}
                  placeholder="Add a project tag and press Enter"
                  className="bg-slate-900/70 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-cyan-600 text-white hover:bg-cyan-500 transition-colors"
                  aria-label="Add tag"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCancelAddTag}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-800/70 text-slate-300 hover:bg-slate-700/70 transition-colors"
                  aria-label="Cancel adding tag"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStartAddingTag}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-cyan-600 text-white hover:bg-cyan-500 transition-colors"
                aria-label="Add a new tag"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          {tagError ? (
            <p className="text-xs text-rose-300">{tagError}</p>
          ) : (
            <p className="text-xs text-slate-500">
              {isAddingTag ? 'Press Enter to add a tag or Esc to cancel.' : 'Click the + button to add a new project tag.'}
            </p>
          )}
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

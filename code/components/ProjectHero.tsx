import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Artifact,
  NanoBananaArtMode,
  Project,
  ProjectComponentKey,
  ProjectStatus,
  ProjectVisibilitySettings,
} from '../types';
import { formatStatusLabel, getStatusClasses } from '../utils/status';
import {
  PlusIcon,
  SparklesIcon,
  BuildingStorefrontIcon,
  TagIcon,
  XMarkIcon,
} from './Icons';
import { useTutorialLanguage } from '../contexts/TutorialLanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { logAnalyticsEvent } from '../services/analytics';
import { generateNanoBananaViaApi, isDataApiConfigured } from '../services/dataApi';
import ConfirmationModal from './ConfirmationModal';
import ProjectSettingsPanel from './ProjectSettingsPanel';

const formatNumber = (value: number): string =>
  new Intl.NumberFormat('en-US', { notation: value > 9999 ? 'compact' : 'standard' }).format(value);

interface ProjectHeroStats {
  totalArtifacts: number;
  completedTasks: number;
  quickFactCount: number;
  relationCount: number;
  uniqueTagCount: number;
  narrativeCount: number;
  wikiWordCount: number;
  lexemeCount: number;
}

interface ProjectHeroProps {
  project: Project;
  stats: ProjectHeroStats;
  quickFacts: Artifact[];
  totalQuickFacts: number;
  statusLabel: string;
  onCreateArtifact: () => void;
  onCaptureQuickFact: () => void;
  onPublishProject: () => void;
  onSelectQuickFact: (id: string) => void;
  level: number;
  xpProgress: number;
  isZenMode?: boolean;
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

interface NanoBananaDraft {
  id: string;
  image: string;
  mode: NanoBananaArtMode;
  prompt: string;
}

const NANO_BANANA_ART_MODES: Record<
  NanoBananaArtMode,
  { label: string; description: string }
> = {
  retro: {
    label: 'Retro',
    description: 'Analog halftones, worn film grain, and bold poster palettes.',
  },
  modern: {
    label: 'Modern',
    description: 'Gallery-lit minimalism with confident editorial contrast.',
  },
  futuristic: {
    label: 'Futuristic',
    description: 'Holographic light, chrome edges, and kinetic energy.',
  },
};

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
    prompt: "One collaborator secretly owes the Clockwork Guild three favors, and the first repayment comes due tonight.",
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
    prompt:
      'An upcoming eclipse will tint the world map in copper light; any location tagged "eclipse-ready" gains bonus visibility.',
    spark: 'Tag assets that thrive during the eclipse and note who is preparing.',
  },
  {
    id: 'faction-overture',
    category: 'Diplomacy Move',
    prompt: "A rival faction sends a peace overture encoded in a children's rhyme that only veteran players recognize.",
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

const GENERATIVE_IMAGE_TROUBLESHOOTING: readonly string[] = [
  'Sign in with a full Creative Atlas account—guest mode cannot call the Gemini thumbnail service.',
  'Gemini enforces community guidelines. Simplify the title, summary, or tags if the request is blocked for safety reasons.',
  'You can request up to 50 previews per user/day. Wait until the limit resets before trying again.',
];

const parseNanoBananaErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed === 'object' && 'error' in parsed) {
        const extracted = (parsed as { error?: unknown }).error;
        if (typeof extracted === 'string' && extracted.trim()) {
          return extracted;
        }
      }
    } catch {
      // Ignore JSON parse failures and fall through to the default string.
    }
    if (error.message.trim()) {
      return error.message;
    }
  }
  return 'Creative Atlas generative art request failed. Please try again in a few moments.';
};

const QuickFactCard: React.FC<{ fact: Artifact; onSelect: (id: string) => void; label: string }> = ({
  fact,
  onSelect,
  label,
}) => (
  <button
    type="button"
    onClick={() => onSelect(fact.id)}
    className="group flex flex-col gap-1 rounded-xl border border-slate-700/60 bg-slate-900/70 p-4 text-left transition-all hover:-translate-y-1 hover:border-cyan-500/60 hover:bg-slate-900/80"
  >
    <span className="text-[11px] font-semibold uppercase tracking-wide text-cyan-300/80">{label}</span>
    <span className="text-sm font-semibold text-slate-100 group-hover:text-white">{fact.title}</span>
    {fact.summary && (
      <p
        className="text-xs text-slate-400"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {fact.summary}
      </p>
    )}
  </button>
);

const ProjectHero: React.FC<ProjectHeroProps> = ({
  project,
  stats,
  quickFacts,
  totalQuickFacts,
  statusLabel,
  onCreateArtifact,
  onCaptureQuickFact,
  onPublishProject,
  onSelectQuickFact,
  level,
  xpProgress,
  isZenMode = false,
  onUpdateProject,
  onDeleteProject,
  visibilitySettings,
  onToggleVisibility,
  onResetVisibility,
}) => {
  const hasQuickFacts = quickFacts.length > 0;
  const language = useTutorialLanguage();
  const { getIdToken, isGuestMode } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState(project.title);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [summaryDraft, setSummaryDraft] = useState(project.summary);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [isQuickFactsOpen, setIsQuickFactsOpen] = useState(false);
  const [factSuggestion, setFactSuggestion] = useState<FactPrompt | null>(null);
  const [factFeedback, setFactFeedback] = useState<string | null>(null);
  const [lastFactId, setLastFactId] = useState<string | null>(null);
  const [isGeneratingNanoBanana, setIsGeneratingNanoBanana] = useState(false);
  const [nanoBananaError, setNanoBananaError] = useState<string | null>(null);
  const [nanoBananaMode, setNanoBananaMode] = useState<NanoBananaArtMode>('retro');
  const [nanoBananaDrafts, setNanoBananaDrafts] = useState<NanoBananaDraft[]>([]);
  const canRequestNanoBanana = !isGuestMode && isDataApiConfigured;
  const feedbackTimeoutRef = useRef<number | null>(null);
  const tagInputRef = useRef<HTMLInputElement | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const quickFactsPanelRef = useRef<HTMLDivElement | null>(null);
  const quickFactsButtonRef = useRef<HTMLButtonElement | null>(null);

  const copy = useMemo(
    () => ({
      ...(language === 'es'
        ? {
            quickFactLabel: 'Dato rápido',
            quickFactsHeading: 'Últimos datos rápidos',
            savedSoFar: 'guardados hasta ahora',
            emptyMessage: 'Captura tu primera chispa de lore para construir una estantería de referencia rápida.',
            emptyCta: 'Agrega tu primer dato',
          }
        : {
            quickFactLabel: 'Quick Fact',
            quickFactsHeading: 'Latest quick facts',
            savedSoFar: 'saved so far',
            emptyMessage: 'Capture your first lore spark to build a quick reference shelf.',
            emptyCta: 'Add your first fact',
          }),
    }),
    [language],
  );

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
    setNanoBananaError(null);
    setIsGeneratingNanoBanana(false);
    setNanoBananaMode('retro');
    setNanoBananaDrafts([]);
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
      if (settingsPanelRef.current?.contains(target) || settingsButtonRef.current?.contains(target)) {
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

  useEffect(() => {
    if (!isQuickFactsOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (quickFactsPanelRef.current?.contains(target) || quickFactsButtonRef.current?.contains(target)) {
        return;
      }
      setIsQuickFactsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsQuickFactsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isQuickFactsOpen]);

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

  const handleGenerateNanoBanana = async () => {
    if (!canRequestNanoBanana) {
      setNanoBananaError('Creative Atlas generative art is only available for signed-in creators.');
      return;
    }

    setNanoBananaError(null);
    setIsGeneratingNanoBanana(true);
    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('Authentication is required to call the Gemini thumbnail service.');
      }
      const result = await generateNanoBananaViaApi(token, project.id, { mode: nanoBananaMode });
      setNanoBananaDrafts((current) => {
        const draft: NanoBananaDraft = {
          id: `${result.mode}-${Date.now()}`,
          image: result.image,
          mode: result.mode,
          prompt: result.prompt,
        };
        return [draft, ...current].slice(0, 3);
      });
    } catch (error) {
      console.error('Failed to request Creative Atlas generative art preview', error);
      setNanoBananaError(parseNanoBananaErrorMessage(error));
    } finally {
      setIsGeneratingNanoBanana(false);
    }
  };

  const handleApplyNanoBanana = (image: string) => {
    setNanoBananaError(null);
    onUpdateProject(project.id, { nanoBananaImage: image });
    setNanoBananaDrafts([]);
  };

  const handleClearNanoBananaDrafts = () => {
    setNanoBananaDrafts([]);
  };

  const handleRemoveNanoBanana = () => {
    setNanoBananaError(null);
    onUpdateProject(project.id, { nanoBananaImage: null });
  };

  const renderGenerativeArtSection = () => {
    return (
      <div className="space-y-4 rounded-xl border border-amber-400/30 bg-amber-500/5 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">Creative Atlas generative art</p>
            <h3 className="text-sm font-semibold text-slate-100">Generate a share-ready hero image</h3>
            <p className="text-xs text-slate-400">
              This art displays above your workspace summary and becomes the open graph thumbnail when you share the atlas.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleGenerateNanoBanana}
              className="inline-flex items-center gap-2 rounded-md bg-amber-400/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isGeneratingNanoBanana || !canRequestNanoBanana}
            >
              {isGeneratingNanoBanana ? 'Generating…' : 'Generate art preview'}
            </button>
            {!canRequestNanoBanana ? (
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-200">
                Sign in to use Creative Atlas generative art
              </p>
            ) : null}
            {project.nanoBananaImage ? (
              <button
                type="button"
                onClick={handleRemoveNanoBanana}
                className="inline-flex items-center gap-2 rounded-md border border-amber-400/50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-amber-200 transition-colors hover:border-amber-300 hover:text-white"
              >
                Remove image
              </button>
            ) : null}
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-200">Art mode</p>
            <div className="grid gap-2 md:grid-cols-3">
              {(Object.entries(NANO_BANANA_ART_MODES) as [
                NanoBananaArtMode,
                (typeof NANO_BANANA_ART_MODES)[NanoBananaArtMode],
              ][]).map(([modeKey, modeConfig]) => (
                <label
                  key={modeKey}
                  className={`flex cursor-pointer flex-col rounded-lg border px-3 py-3 text-xs transition ${
                    nanoBananaMode === modeKey
                      ? 'border-amber-300/60 bg-amber-300/10 text-amber-100'
                      : 'border-amber-200/20 bg-slate-900/40 text-slate-300 hover:border-amber-200/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{modeConfig.label}</p>
                    <input
                      type="radio"
                      name="nano-banana-mode"
                      value={modeKey}
                      checked={nanoBananaMode === modeKey}
                      onChange={() => setNanoBananaMode(modeKey)}
                      className="sr-only"
                    />
                    <span
                      className={`inline-flex h-2 w-2 rounded-full ${
                        nanoBananaMode === modeKey ? 'bg-amber-300' : 'bg-slate-500'
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">{modeConfig.description}</p>
                </label>
              ))}
            </div>
          </div>
        </div>
        {nanoBananaDrafts.length > 0 ? (
          <div className="space-y-3 rounded-lg border border-amber-400/30 bg-slate-950/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">Pick your favorite</p>
                <p className="text-xs text-slate-300">Apply a thumbnail to the project or keep generating to explore more looks.</p>
              </div>
              <button
                type="button"
                onClick={handleClearNanoBananaDrafts}
                className="text-[11px] font-semibold uppercase tracking-wide text-amber-200 underline-offset-2 hover:underline"
              >
                Clear gallery
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {nanoBananaDrafts.map((draft, index) => {
                const modeConfig = NANO_BANANA_ART_MODES[draft.mode];
                return (
                  <div key={draft.id} className="flex flex-col overflow-hidden rounded-lg border border-amber-400/20 bg-slate-900/70">
                    <div className="aspect-[1200/630] w-full border-b border-slate-800/60 bg-slate-950/40">
                      <img
                        src={draft.image}
                        alt={`${project.title} ${modeConfig.label} preview option`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-3 text-xs text-slate-300">
                      <div>
                        <p className="text-sm font-semibold text-white">{modeConfig.label} preview {index + 1}</p>
                        <p className="text-[11px] text-slate-400" title={draft.prompt}>
                          {draft.prompt.length > 110 ? `${draft.prompt.slice(0, 110)}…` : draft.prompt}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApplyNanoBanana(draft.image)}
                        className="inline-flex items-center justify-center rounded-md bg-amber-400/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-950 transition hover:bg-amber-300"
                      >
                        Use this image
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        {nanoBananaError ? (
          <div className="space-y-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-4 text-xs text-rose-100">
            <p className="font-semibold">{nanoBananaError}</p>
            <ul className="list-disc space-y-1 pl-5 text-rose-200">
              {GENERATIVE_IMAGE_TROUBLESHOOTING.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        ) : project.nanoBananaImage ? (
          <div className="rounded-lg border border-amber-400/30 bg-slate-950/40 px-4 py-3 text-xs text-amber-100">
            Creative Atlas generative art is applied to your project and will appear on shared links.
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-amber-400/40 bg-slate-900/40 px-4 py-6 text-xs text-slate-400">
            Generate Creative Atlas generative art to preview how your project will look in the hero panel and on social cards.
          </div>
        )}
      </div>
    );
  };

  const handleCreateArtifact = useCallback(() => {
    void logAnalyticsEvent('workspace_create_artifact_clicked', {
      project_id: project.id,
      source: 'hero_panel',
    });
    onCreateArtifact();
  }, [onCreateArtifact, project.id]);

  const handleCaptureQuickFact = useCallback(() => {
    void logAnalyticsEvent('quick_fact_capture_started', {
      project_id: project.id,
      source: hasQuickFacts ? 'hero_panel' : 'hero_panel_empty_state',
    });
    onCaptureQuickFact();
  }, [hasQuickFacts, onCaptureQuickFact, project.id]);

  const handlePublishProject = useCallback(() => {
    void logAnalyticsEvent('workspace_publish_clicked', {
      project_id: project.id,
      source: 'hero_panel',
    });
    onPublishProject();
  }, [onPublishProject, project.id]);

  return (
    <>
      <section
        id="project-hero-panel"
        className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 sm:p-8 text-slate-100 shadow-xl"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_55%)]" aria-hidden />
        <div className="relative space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusClasses(project.status)}`}>
                {statusLabel}
              </span>
              {!isZenMode ? (
                <span className="rounded-full border border-slate-600/60 bg-slate-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Level {level} · {xpProgress} XP toward next
                </span>
              ) : null}
              {project.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-slate-400">
                  {project.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full border border-slate-600/60 bg-slate-900/70 px-2 py-1 text-[10px] font-semibold text-slate-300">
                      #{tag}
                    </span>
                  ))}
                  {project.tags.length > 3 && (
                    <span className="rounded-full border border-slate-600/60 bg-slate-900/70 px-2 py-1 text-[10px] font-semibold text-slate-400">
                      +{project.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Status
                <select
                  value={project.status}
                  onChange={handleStatusChange}
                  className="ml-2 rounded-md border border-slate-700/70 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  {statusOrder.map((status) => (
                    <option key={status} value={status}>
                      {formatStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                ref={settingsButtonRef}
                onClick={() => setIsSettingsOpen((current) => !current)}
                className="inline-flex items-center gap-2 rounded-md border border-slate-600/60 bg-slate-800/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                aria-expanded={isSettingsOpen}
                aria-haspopup="true"
              >
                Project settings
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteConfirmVisible(true)}
                className="inline-flex items-center gap-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-100 transition hover:border-rose-300/70 hover:bg-rose-500/20"
              >
                Delete project
              </button>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{project.title}</h2>
              {project.summary ? (
                <p className="max-w-2xl text-sm text-slate-300 sm:text-base">{project.summary}</p>
              ) : null}
              {!isZenMode ? (
                <p className="text-sm text-slate-400">
                  {formatNumber(stats.totalArtifacts)} artifacts · {formatNumber(stats.wikiWordCount)} wiki words · Level {level} ({xpProgress} XP to next)
                </p>
              ) : null}
              <p className="text-[11px] font-mono text-slate-500">ID: {project.id}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCreateArtifact}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition-all hover:-translate-y-0.5 hover:border-cyan-300/70 hover:bg-cyan-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
            >
              <PlusIcon className="h-4 w-4" />
              New artifact
            </button>
            <button
              type="button"
              onClick={handleCaptureQuickFact}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100 transition-all hover:-translate-y-0.5 hover:border-amber-300/60 hover:bg-amber-500/20 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            >
              <SparklesIcon className="h-4 w-4" />
              Capture fact
            </button>
            <button
              type="button"
              onClick={handlePublishProject}
              id="publish-world-button"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition-all hover:-translate-y-0.5 hover:border-emerald-300/60 hover:bg-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            >
              <BuildingStorefrontIcon className="h-4 w-4" />
              Publish atlas
            </button>
            <button
              type="button"
              ref={quickFactsButtonRef}
              onClick={() => setIsQuickFactsOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-600/60 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-100 transition-all hover:-translate-y-0.5 hover:border-cyan-300/60"
              aria-expanded={isQuickFactsOpen}
            >
              Quick facts ({totalQuickFacts})
            </button>
          </div>
        </div>

        {isSettingsOpen ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center px-4 py-8 sm:px-6">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <div
              ref={settingsPanelRef}
              role="dialog"
              aria-modal="true"
              className="relative z-10 w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-950/95 shadow-2xl shadow-slate-900/60 backdrop-blur"
            >
              <div className="max-h-[85vh] space-y-6 overflow-y-auto p-6">
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
          </div>
        ) : null}
        {isQuickFactsOpen ? (
          <div className="fixed inset-0 z-30 flex items-center justify-center px-4 py-8 sm:px-6">
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
            <div
              ref={quickFactsPanelRef}
              role="dialog"
              aria-modal="true"
              className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-950/95 shadow-2xl"
            >
              <div className="max-h-[75vh] space-y-4 overflow-y-auto p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{copy.quickFactsHeading}</p>
                    <p className="text-xs text-slate-500">{totalQuickFacts} {copy.savedSoFar}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsQuickFactsOpen(false)}
                    className="text-xs font-semibold uppercase tracking-wide text-slate-300 hover:text-white"
                  >
                    Close
                  </button>
                </div>
                <div className="grid gap-3">
                  {hasQuickFacts ? (
                    quickFacts.map((fact) => (
                      <QuickFactCard
                        key={fact.id}
                        fact={fact}
                        onSelect={(id) => {
                          onSelectQuickFact(id);
                          setIsQuickFactsOpen(false);
                        }}
                        label={copy.quickFactLabel}
                      />
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-600/60 bg-slate-900/80 p-4 text-xs text-slate-400">
                      {copy.emptyMessage}
                    </div>
                  )}
                </div>
                {!hasQuickFacts ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickFactsOpen(false);
                      handleCaptureQuickFact();
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:border-amber-300/60 hover:bg-amber-500/20"
                  >
                    <SparklesIcon className="h-3.5 w-3.5" />
                    {copy.emptyCta}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="mt-6 space-y-6 rounded-3xl border border-slate-800/70 bg-slate-950/50 p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Dashboard / Overview</p>
          <h3 className="text-xl font-semibold text-white">Keep your atlas aligned</h3>
          <p className="text-sm text-slate-400">
            Shuffle prompts, refresh Creative Atlas art, and organize tags without leaving the workspace.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            {renderGenerativeArtSection()}
            <div className="space-y-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5">
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
                  {factFeedback ? <p className="text-xs font-semibold text-emerald-300">{factFeedback}</p> : null}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-cyan-500/20 bg-slate-900/40 px-4 py-6 text-xs text-slate-400">
                  Tap <span className="font-semibold text-cyan-200">Shuffle prompt</span> to reveal a lore beat you can capture without overthinking the full artifact form.
                </p>
              )}
            </div>
          </div>
          <div className="space-y-6">
            <div className="space-y-3 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
                <TagIcon className="w-4 h-4 text-cyan-300" />
                Tags
                <span className="text-xs font-normal text-slate-500">({tagCount})</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-700/60 bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-200"
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
                {project.tags.length === 0 && !isAddingTag ? (
                  <span className="text-xs text-slate-500">No tags yet. Add some to aid search and filtering.</span>
                ) : null}
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
                      className="rounded-md border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-600 text-white transition-colors hover:bg-cyan-500"
                      aria-label="Add tag"
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelAddTag}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-800/70 text-slate-300 transition-colors hover:bg-slate-700/70"
                      aria-label="Cancel adding tag"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartAddingTag}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-600 text-white transition-colors hover:bg-cyan-500"
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
          </div>
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

export default ProjectHero;

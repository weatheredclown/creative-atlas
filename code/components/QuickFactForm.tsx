import React, { useCallback, useState } from 'react';
import type { Artifact } from '../types';
import { generateQuickFactInspiration } from '../services/geminiService';
import { SparklesIcon } from './Icons';

interface QuickFactFormProps {
  projectTitle: string;
  artifacts: Artifact[];
  onSubmit: (input: { fact: string; detail?: string }) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting: boolean;
}

interface FactPrompt {
  id: string;
  prompt: string;
  spark: string;
}

const FALLBACK_FACT_PROMPTS: readonly FactPrompt[] = [
  {
    id: 'leyline-beacon',
    prompt: 'A dormant leyline beacon beneath headquarters pulses once at dusk, hinting that old wards are waking up.',
    spark: 'Log a wiki entry about magical infrastructure flickering back online.',
  },
  {
    id: 'clockwork-debt',
    prompt: 'Someone on the crew secretly owes the Clockwork Guild three favors—and the first repayment is due tonight.',
    spark: 'Drop a character note about who calls in the debt and why it matters.',
  },
  {
    id: 'whisperwood-rumor',
    prompt: 'Whisperwood birds fall silent near the northern ridge, the sure sign that a new rift is bleeding through.',
    spark: 'Map the ridge or queue a quest to seal the breach before dawn.',
  },
  {
    id: 'artifact-glow',
    prompt: 'A mundane artifact glows whenever it sits beside lexemes that share its root syllable.',
    spark: 'Link a conlang entry to the relic and explore why language activates it.',
  },
  {
    id: 'streak-charm',
    prompt: 'Maintaining a seven-day streak unlocks a charm that doubles XP earned from building relations for one session.',
    spark: 'Celebrate streak milestones or craft a questline tied to the charm\'s power.',
  },
  {
    id: 'map-eclipse',
    prompt: 'An upcoming eclipse will tint the world map in copper light; any location tagged "eclipse-ready" gains bonus visibility.',
    spark: 'Tag assets that thrive during the eclipse and note who is preparing.',
  },
];

const QuickFactForm: React.FC<QuickFactFormProps> = ({
  projectTitle,
  artifacts,
  onSubmit,
  onCancel,
  isSubmitting,
}) => {
  const [fact, setFact] = useState('');
  const [detail, setDetail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [surprisePrompt, setSurprisePrompt] = useState<FactPrompt | null>(() => {
    if (FALLBACK_FACT_PROMPTS.length === 0) {
      return null;
    }
    const initialIndex = Math.floor(Math.random() * FALLBACK_FACT_PROMPTS.length);
    return FALLBACK_FACT_PROMPTS[initialIndex] ?? null;
  });
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [surpriseError, setSurpriseError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedFact = fact.trim();
    const trimmedDetail = detail.trim();

    if (!trimmedFact) {
      setError('Capture at least one sentence for your fact.');
      return;
    }

    setError(null);

    try {
      await onSubmit({ fact: trimmedFact, detail: trimmedDetail.length > 0 ? trimmedDetail : undefined });
      setFact('');
      setDetail('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'We could not save your fact. Please try again.';
      setError(message);
    }
  };

  const summonQuickFactPrompt = useCallback(async () => {
    setIsGeneratingPrompt(true);
    setSurpriseError(null);

    try {
      const inspiration = await generateQuickFactInspiration({ projectTitle, artifacts });
      const generatedFact = inspiration.fact.trim();
      if (!generatedFact) {
        throw new Error('Atlas Intelligence returned an empty fact.');
      }

      const generatedSpark = inspiration.spark?.trim() ?? '';
      const generatedPrompt: FactPrompt = {
        id: `ai-${Date.now()}`,
        prompt: generatedFact,
        spark: generatedSpark,
      };

      setSurprisePrompt(generatedPrompt);
      setFact(generatedFact);
      setDetail('');
      setError(null);
    } catch (err) {
      console.error('Failed to generate quick fact inspiration', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Atlas Intelligence could not propose a quick fact right now.';
      setSurpriseError(message);
    } finally {
      setIsGeneratingPrompt(false);
    }
  }, [artifacts, projectTitle]);

  const handleSurpriseMe = () => {
    if (isGeneratingPrompt) {
      return;
    }
    void summonQuickFactPrompt();
  };

  const handleCancel = () => {
    setFact('');
    setDetail('');
    setError(null);
    setSurpriseError(null);
    onCancel();
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm text-cyan-100">
        <p className="font-semibold text-cyan-200">Add a single beat of lore to {projectTitle}.</p>
        <p>Think small: a rumor, detail, or truth you can expand later. We&apos;ll drop it straight into your wiki.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="quick-fact" className="block text-sm font-medium text-slate-200">
          Fact
        </label>
        <textarea
          id="quick-fact"
          value={fact}
          onChange={(event) => {
            setFact(event.target.value);
            if (error) {
              setError(null);
            }
            if (surpriseError) {
              setSurpriseError(null);
            }
          }}
          rows={3}
          className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder={
            surprisePrompt?.prompt ?? 'Capture a small truth, rumor, or detail you can expand later.'
          }
        />
        {error && <p className="text-xs text-rose-300">{error}</p>}
        {surprisePrompt?.spark && (
          <p className="text-xs text-slate-500">Spark: {surprisePrompt.spark}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="quick-fact-detail" className="block text-sm font-medium text-slate-200">
          Why it matters (optional)
        </label>
        <textarea
          id="quick-fact-detail"
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="Add a quick note about the impact, rumor source, or a follow-up thread."
        />
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleSurpriseMe}
          className="inline-flex items-center gap-2 text-sm font-semibold text-amber-300 hover:text-amber-200 disabled:cursor-not-allowed disabled:text-amber-200/60"
          aria-label="Use a surprise prompt"
          disabled={isGeneratingPrompt}
        >
          <SparklesIcon className="h-4 w-4" />
          {isGeneratingPrompt ? 'Summoning…' : 'Surprise me'}
        </button>
        <p className="text-xs text-slate-500">
          Need inspiration? Tap Surprise me to ask Atlas Intelligence for a prompt rooted in your
          artifacts.
        </p>
      </div>
      {surpriseError && (
        <p className="text-xs text-amber-200" aria-live="polite">
          {surpriseError}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-md bg-slate-700/60 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-5 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/40 disabled:text-emerald-100"
          disabled={isSubmitting}
        >
          Save fact
        </button>
      </div>
    </form>
  );
};

export default QuickFactForm;

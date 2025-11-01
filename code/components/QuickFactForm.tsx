import React, { useMemo, useState } from 'react';
import { SparklesIcon } from './Icons';

interface QuickFactFormProps {
  projectTitle: string;
  onSubmit: (input: { fact: string; detail?: string }) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const FACT_PROMPTS: readonly string[] = [
  'The capital city is powered by an ancient engine hidden below the streets.',
  'Every eclipse awakens a guardian spirit that patrols the border for one night.',
  'Only members of the lunar guild can read the floating script that appears at dawn.',
  'The royal family trades in stories instead of gold to pay their allies.',
  'No one remembers building the lighthouse—yet its flame has never gone out.',
];

const QuickFactForm: React.FC<QuickFactFormProps> = ({ projectTitle, onSubmit, onCancel, isSubmitting }) => {
  const [fact, setFact] = useState('');
  const [detail, setDetail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [promptIndex, setPromptIndex] = useState(() => Math.floor(Math.random() * FACT_PROMPTS.length));

  const surprisePrompt = useMemo(() => FACT_PROMPTS[promptIndex] ?? FACT_PROMPTS[0], [promptIndex]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedFact = fact.trim();
    const trimmedDetail = detail.trim();

    if (!trimmedFact) {
      setError('Capture at least one sentence for your fact.');
      return;
    }

    setError(null);
    await onSubmit({ fact: trimmedFact, detail: trimmedDetail.length > 0 ? trimmedDetail : undefined });
  };

  const handleSurpriseMe = () => {
    const nextIndex = (promptIndex + 1) % FACT_PROMPTS.length;
    setPromptIndex(nextIndex);
    setFact(FACT_PROMPTS[nextIndex]);
    setError(null);
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
          }}
          rows={3}
          className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder={surprisePrompt}
        />
        {error && <p className="text-xs text-rose-300">{error}</p>}
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
          className="inline-flex items-center gap-2 text-sm font-semibold text-amber-300 hover:text-amber-200"
          aria-label="Use a surprise prompt"
        >
          <SparklesIcon className="h-4 w-4" />
          Surprise me
        </button>
        <p className="text-xs text-slate-500">Need inspiration? Tap Surprise me to drop in a prompt.</p>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
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

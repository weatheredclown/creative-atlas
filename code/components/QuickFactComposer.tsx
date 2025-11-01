import React, { useState } from 'react';
import { SparklesIcon, XMarkIcon } from './Icons';

interface QuickFactComposerProps {
  onSubmit: (fact: string) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting: boolean;
  projectTitle: string;
}

const QuickFactComposer: React.FC<QuickFactComposerProps> = ({
  onSubmit,
  onCancel,
  isSubmitting,
  projectTitle,
}) => {
  const [fact, setFact] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = fact.trim();

    if (!trimmed) {
      setError('Add a short fact before saving it.');
      return;
    }

    setError(null);

    try {
      await onSubmit(trimmed);
      setFact('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save the fact. Please try again.';
      setError(message);
    }
  };

  const handleCancel = () => {
    setFact('');
    setError(null);
    onCancel();
  };

  return (
    <div className="mt-4 rounded-xl border border-cyan-500/40 bg-cyan-950/40 p-4 shadow-lg shadow-cyan-900/40">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-cyan-500/20 p-2 text-cyan-200">
            <SparklesIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-cyan-100">Add one fact</h3>
            <p className="text-xs text-slate-300">
              Drop a single detail for <span className="font-semibold text-white">{projectTitle}</span> without opening the full
              seed form.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-md border border-transparent p-1 text-slate-400 hover:border-slate-600 hover:text-slate-200"
          aria-label="Close quick fact composer"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        <label htmlFor="quick-fact-input" className="sr-only">
          Fact details
        </label>
        <textarea
          id="quick-fact-input"
          value={fact}
          onChange={(event) => {
            setFact(event.target.value);
            if (error) {
              setError(null);
            }
          }}
          placeholder="e.g., The Beacon Market reopens every full moon with contraband relics."
          rows={3}
          className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          disabled={isSubmitting}
        />
        {error && <p className="text-xs text-rose-300">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            We&apos;ll save this as a lightweight wiki entry so you can flesh it out later.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-slate-100"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-900 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving…' : 'Save fact'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default QuickFactComposer;

import React from 'react';
import { Artifact, WikiData } from '../types';
import { SparklesIcon } from './Icons';

interface QuickFactsPanelProps {
  facts: Artifact[];
  totalFacts: number;
  projectTitle: string;
  onSelectFact: (artifactId: string) => void;
  onAddFact: () => void;
}

const createFactPreview = (artifact: Artifact): { fact: string; detail: string | null } => {
  const data = artifact.data as WikiData | undefined;
  if (!data || typeof data.content !== 'string' || data.content.trim().length === 0) {
    const summary = artifact.summary.trim();
    return { fact: summary.length > 0 ? summary : artifact.title, detail: null };
  }

  const lines = data.content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('# '));

  if (lines.length === 0) {
    const summary = artifact.summary.trim();
    return { fact: summary.length > 0 ? summary : artifact.title, detail: null };
  }

  const [fact, ...rest] = lines;
  const detail = rest.join(' ').trim();

  return {
    fact: fact.length > 0 ? fact : artifact.title,
    detail: detail.length > 0 ? detail : null,
  };
};

type CopyStatus = {
  id: string;
  status: 'copied' | 'error';
};

const writeTextToClipboard = async (text: string) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document === 'undefined') {
    throw new Error('Clipboard APIs are not available.');
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  if (typeof textarea.setSelectionRange === 'function') {
    textarea.setSelectionRange(0, textarea.value.length);
  }
  const successful = document.execCommand('copy');
  document.body.removeChild(textarea);

  if (!successful) {
    throw new Error('Copy command was unsuccessful.');
  }
};

const QuickFactsPanel: React.FC<QuickFactsPanelProps> = ({
  facts,
  totalFacts,
  projectTitle,
  onSelectFact,
  onAddFact,
}) => {
  const hasFacts = facts.length > 0;
  const [copyStatus, setCopyStatus] = React.useState<CopyStatus | null>(null);

  React.useEffect(() => {
    if (!copyStatus || typeof window === 'undefined') {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCopyStatus(null);
    }, 2400);

    return () => window.clearTimeout(timeout);
  }, [copyStatus]);

  const handleCopyFact = async (artifact: Artifact) => {
    const preview = createFactPreview(artifact);
    const segments: string[] = [];
    const trimmedTitle = artifact.title.trim();
    const trimmedFact = preview.fact.trim();
    const trimmedDetail = preview.detail?.trim();

    if (trimmedTitle.length > 0) {
      segments.push(trimmedTitle);
    }

    if (trimmedFact.length > 0) {
      segments.push(trimmedFact);
    }

    if (trimmedDetail && trimmedDetail.length > 0) {
      segments.push(trimmedDetail);
    }

    const textToCopy = segments.join('\n');

    if (textToCopy.length === 0) {
      setCopyStatus({ id: artifact.id, status: 'error' });
      return;
    }

    try {
      await writeTextToClipboard(textToCopy);
      setCopyStatus({ id: artifact.id, status: 'copied' });
    } catch (error) {
      console.error('Failed to copy quick fact to clipboard.', error);
      setCopyStatus({ id: artifact.id, status: 'error' });
    }
  };

  const getCopyButtonLabel = (artifactId: string) => {
    if (!copyStatus || copyStatus.id !== artifactId) {
      return 'Copy fact';
    }

    return copyStatus.status === 'copied' ? 'Copied!' : 'Retry copy';
  };

  return (
    <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 shadow-lg shadow-amber-500/10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-500/20 p-2">
            <SparklesIcon className="h-5 w-5 text-amber-200" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-amber-100">Lore Sparks</h3>
            <p className="text-sm text-amber-200/80">
              Quick facts land straight in your wiki. Revisit them here whenever you need a jump-off point.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onAddFact}
          className="inline-flex items-center gap-2 rounded-md border border-amber-400/60 bg-amber-400/20 px-4 py-2 text-sm font-semibold text-amber-50 transition-colors hover:border-amber-300 hover:bg-amber-400/30"
        >
          <SparklesIcon className="h-4 w-4" />
          Add another fact
        </button>
      </header>

      {hasFacts ? (
        <div className="mt-5 space-y-4">
          <ul className="space-y-3">
            {facts.map((artifact) => {
              const preview = createFactPreview(artifact);
              return (
                <li
                  key={artifact.id}
                  className="rounded-xl border border-amber-400/30 bg-slate-950/60 p-4 shadow-inner shadow-amber-500/10"
                >
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-sm font-semibold text-amber-100">{artifact.title}</p>
                      <p className="mt-1 text-sm text-amber-100/80">{preview.fact}</p>
                      {preview.detail && (
                        <p className="mt-1 text-xs text-amber-200/70">{preview.detail}</p>
                      )}
                      {copyStatus?.id === artifact.id && (
                        <p
                          aria-live="polite"
                          className={`mt-2 text-xs ${
                            copyStatus.status === 'copied'
                              ? 'text-emerald-300/80'
                              : 'text-rose-300/80'
                          }`}
                        >
                          {copyStatus.status === 'copied'
                            ? 'Fact copied to clipboard.'
                            : 'Unable to reach the clipboard. Try again or copy manually.'}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => handleCopyFact(artifact)}
                        className="inline-flex items-center justify-center rounded-md border border-amber-400/60 px-3 py-1.5 text-xs font-semibold text-amber-100 transition-colors hover:border-amber-300 hover:text-amber-50"
                      >
                        {getCopyButtonLabel(artifact.id)}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectFact(artifact.id)}
                        className="inline-flex items-center justify-center rounded-md border border-amber-400/60 px-3 py-1.5 text-xs font-semibold text-amber-100 transition-colors hover:border-amber-300 hover:text-amber-50"
                      >
                        Open fact
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {totalFacts > facts.length && (
            <p className="text-xs text-amber-200/70">
              Showing {facts.length} of {totalFacts} quick facts in {projectTitle}. Open a fact to view the full entry.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-amber-400/40 bg-slate-950/40 p-6 text-center text-sm text-amber-200/80">
          <p className="font-semibold text-amber-100">Drop your first quick fact.</p>
          <p className="mt-1 text-amber-200/70">
            Capture a tiny lore beat for {projectTitle} and we&apos;ll keep it ready for future worldbuilding sessions.
          </p>
        </div>
      )}
    </section>
  );
};

export default QuickFactsPanel;

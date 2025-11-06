import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Artifact, ArtifactType, ConlangLexeme, TaskData, TASK_STATE } from '../types';
import { generateReleaseNotes } from '../services/geminiService';
import { IntelligenceLogo, MegaphoneIcon, Spinner } from './Icons';

interface ReleaseNotesGeneratorProps {
  projectId: string;
  projectTitle: string;
  artifacts: Artifact[];
  addXp: (amount: number) => void;
  onDraftGenerated?: () => void;
}

const formatListPreview = (items: string[], max = 3): string => {
  if (items.length === 0) return '';
  const preview = items.slice(0, max).join(', ');
  const remainder = items.length - max;
  return remainder > 0 ? `${preview} +${remainder} more` : preview;
};

const ReleaseNotesGenerator: React.FC<ReleaseNotesGeneratorProps> = ({
  projectId,
  projectTitle,
  artifacts,
  addXp,
  onDraftGenerated,
}) => {
  const [tone, setTone] = useState('playful');
  const [audience, setAudience] = useState('collaborators');
  const [highlights, setHighlights] = useState('');
  const [hasEditedHighlights, setHasEditedHighlights] = useState(false);
  const [notes, setNotes] = useState('');
  const [generatedNotes, setGeneratedNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const autoHighlights = useMemo(() => {
    if (artifacts.length === 0) {
      return '- Draft highlights for what shipped in this release.';
    }

    const lines: string[] = [];

    const completedTasks = artifacts
      .filter((artifact) => artifact.type === ArtifactType.Task)
      .filter((artifact) => {
        const data = artifact.data as TaskData | undefined;
        return data?.state === TASK_STATE.Done;
      });
    if (completedTasks.length > 0) {
      lines.push(`Completed quests: ${formatListPreview(completedTasks.map((task) => task.title))}.`);
    }

    const shippedArtifacts = artifacts.filter((artifact) => {
      const status = artifact.status?.toLowerCase() ?? '';
      return ['released', 'done', 'alpha', 'beta'].includes(status);
    });
    if (shippedArtifacts.length > 0) {
      const preview = formatListPreview(
        shippedArtifacts.map((artifact) => `${artifact.title} (${artifact.type})`),
      );
      lines.push(`Shipped artifacts: ${preview}.`);
    }

    const conlangWordCount = artifacts
      .filter((artifact) => artifact.type === ArtifactType.Conlang)
      .reduce((count, artifact) => count + ((artifact.data as ConlangLexeme[])?.length ?? 0), 0);
    if (conlangWordCount > 0) {
      lines.push(`Lexicon now holds ${conlangWordCount} words across all conlangs.`);
    }

    const linkedArtifacts = artifacts.filter((artifact) => artifact.relations.length > 0).length;
    const relationCoverage = Math.round((linkedArtifacts / artifacts.length) * 100);
    if (relationCoverage > 0) {
      lines.push(`Link density is at ${relationCoverage}% with ${linkedArtifacts} connected artifacts.`);
    }

    return lines.length > 0
      ? lines.map((line) => `- ${line}`).join('\n')
      : '- Highlight the biggest beats and why they matter.';
  }, [artifacts]);

  useEffect(() => {
    if (!hasEditedHighlights) {
      setHighlights(autoHighlights);
    }
  }, [autoHighlights, hasEditedHighlights]);

  useEffect(() => {
    setTone('playful');
    setAudience('collaborators');
    setGeneratedNotes('');
    setNotes('');
    setError(null);
    setCopyStatus('idle');
    setHasEditedHighlights(false);
    setHighlights(autoHighlights);
    // Reset when viewing a different project so earlier drafts don't leak across worlds.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally omit autoHighlights to keep manual edits when artifacts change.
  }, [projectId, projectTitle]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setCopyStatus('idle');

    try {
      const result = await generateReleaseNotes({
        projectTitle,
        tone,
        audience,
        highlights: highlights.trim(),
        additionalNotes: notes.trim(),
      });
      setGeneratedNotes(result.trim());
      addXp(7); // XP Source: Release Bard assist (+7)
      if (onDraftGenerated) {
        onDraftGenerated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate release notes.');
    } finally {
      setIsGenerating(false);
    }
  }, [projectTitle, tone, audience, highlights, notes, addXp, onDraftGenerated]);

  const handleCopy = async () => {
    if (!generatedNotes) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(generatedNotes);
        setCopyStatus('copied');
        setTimeout(() => setCopyStatus('idle'), 2500);
      }
    } catch (err) {
      console.warn('Failed to copy release notes', err);
    }
  };

  return (
    <section className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 space-y-5">
      <header className="flex items-center gap-3">
        <div className="flex items-center justify-center rounded-xl bg-amber-500/10 border border-amber-400/40 p-2">
          <IntelligenceLogo className="w-5 h-5 text-amber-300" />
        </div>
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-300/80">
            <MegaphoneIcon className="w-4 h-4" />
            Release Bard
          </div>
          <h3 className="text-lg font-semibold text-slate-100">Atlas Intelligence Release Bard</h3>
          <p className="text-sm text-slate-400">
            Turn highlights into narrative release notes tailored to your team or community.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Tone
          <select
            value={tone}
            onChange={(event) => setTone(event.target.value)}
            className="mt-1 px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 focus:ring-2 focus:ring-amber-500"
          >
            <option value="playful">Playful & celebratory</option>
            <option value="heroic">Heroic fantasy scroll</option>
            <option value="formal">Formal release bulletin</option>
            <option value="technical">Technical changelog</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Audience
          <select
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            className="mt-1 px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 focus:ring-2 focus:ring-amber-500"
          >
            <option value="collaborators">Collaborators & co-creators</option>
            <option value="patrons">Patrons & supporters</option>
            <option value="public">Public changelog</option>
            <option value="players">Playtesters & players</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-2 text-sm text-slate-300">
        Highlights to share
        <textarea
          value={highlights}
          onChange={(event) => {
            setHighlights(event.target.value);
            setHasEditedHighlights(true);
          }}
          rows={5}
          className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 focus:ring-2 focus:ring-amber-500"
          placeholder="- Completed quests or tasks\n- New artifacts in this release"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm text-slate-300">
        Optional calls-to-action
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 focus:ring-2 focus:ring-amber-500"
          placeholder="Invite readers to explore, share feedback, or join the next playtest."
        />
      </label>

      {error && (
        <div className="bg-rose-900/30 border border-rose-800 text-rose-200 text-sm rounded-md px-3 py-2" role="alert">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating || !highlights.trim()}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-md transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <>
            <Spinner className="w-5 h-5" />
            Summoning bard...
          </>
        ) : (
          <>
            <IntelligenceLogo className="w-4 h-4" />
            Generate release notes
          </>
        )}
      </button>

      {generatedNotes && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <p className="font-semibold text-slate-200">Draft release notes</p>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs font-semibold text-amber-300 hover:text-amber-200"
            >
              {copyStatus === 'copied' ? 'Copied!' : 'Copy to clipboard'}
            </button>
          </div>
          <pre className="whitespace-pre-wrap bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-sm text-slate-200">
            {generatedNotes}
          </pre>
        </div>
      )}
    </section>
  );
};

export default ReleaseNotesGenerator;

import React, { useMemo } from 'react';
import { Artifact, ArtifactType, ArcStageId } from '../types';
import {
  CharacterArcEvaluation,
  evaluateCharacterArc,
  formatProgressionStatus,
} from '../utils/characterProgression';
import { FlagIcon, ShareIcon, SparklesIcon } from './Icons';

interface CharacterArcTrackerProps {
  artifacts: Artifact[];
}

interface CharacterArcEntry extends CharacterArcEvaluation {
  character: Artifact;
}

const stageBadgeClassNames: Record<ArcStageId, string> = {
  spark: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/60',
  rising: 'bg-violet-500/20 text-violet-200 border-violet-400/60',
  crisis: 'bg-amber-500/20 text-amber-200 border-amber-400/60',
  transformation: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/60',
  legacy: 'bg-pink-500/20 text-pink-200 border-pink-400/60',
};

const stageBorderClassNames: Record<ArcStageId, string> = {
  spark: 'border-cyan-500/40',
  rising: 'border-violet-500/40',
  crisis: 'border-amber-500/40',
  transformation: 'border-emerald-500/40',
  legacy: 'border-pink-500/40',
};

const CharacterArcTracker: React.FC<CharacterArcTrackerProps> = ({ artifacts }) => {
  const lookup = useMemo(() => new Map(artifacts.map((artifact) => [artifact.id, artifact])), [artifacts]);

  const entries = useMemo<CharacterArcEntry[]>(() => {
    return artifacts
      .filter((artifact) => artifact.type === ArtifactType.Character)
      .map((character) => ({
        character,
        ...evaluateCharacterArc(character, lookup),
      }))
      .sort((a, b) => b.score - a.score);
  }, [artifacts, lookup]);

  const stageCounts = useMemo(() => {
    return entries.reduce<Record<ArcStageId, number>>((accumulator, entry) => {
      accumulator[entry.stage.id] = (accumulator[entry.stage.id] ?? 0) + 1;
      return accumulator;
    }, {
      spark: 0,
      rising: 0,
      crisis: 0,
      transformation: 0,
      legacy: 0,
    });
  }, [entries]);

  if (entries.length === 0) {
    return (
      <section className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 space-y-4">
        <header className="flex items-center gap-3">
          <SparklesIcon className="w-5 h-5 text-cyan-300" />
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Character Arc Tracker</h3>
            <p className="text-sm text-slate-400">Add character artifacts to start charting progression states.</p>
          </div>
        </header>
        <p className="text-sm text-slate-400">
          No character profiles yet. Seed your cast to unlock arc staging, continuity prompts, and narrative heat checks.
        </p>
      </section>
    );
  }

  const advancedArcs = stageCounts.transformation + stageCounts.legacy;
  const crisisReady = stageCounts.crisis + stageCounts.transformation;

  return (
    <section className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-cyan-500/20 border border-cyan-400/40 p-2 text-cyan-200">
            <SparklesIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Arc Progression</p>
            <h3 className="text-xl font-semibold text-slate-100">Character Arc Tracker</h3>
            <p className="text-sm text-slate-400">
              Visualize how each character advances from spark to legacy, and surface the next high-impact beat to author.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full sm:w-auto">
          <div className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Active arcs</p>
            <p className="text-2xl font-bold text-cyan-50">{entries.length}</p>
          </div>
          <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">Climax ready</p>
            <p className="text-2xl font-bold text-amber-50">{crisisReady}</p>
          </div>
          <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Legacy threads</p>
            <p className="text-2xl font-bold text-emerald-50">{advancedArcs}</p>
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {entries.map((entry) => {
          const keyBeats = entry.narrativeLinks.slice(0, 3);
          return (
            <article
              key={entry.character.id}
              className={`bg-slate-950/60 border ${stageBorderClassNames[entry.stage.id]} rounded-2xl p-4 space-y-4`}
            >
              <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-slate-100">{entry.character.title}</h4>
                  <p className="text-sm text-slate-400">{entry.character.summary || 'No summary provided yet.'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md border ${stageBadgeClassNames[entry.stage.id]}`}
                  >
                    {entry.stage.label}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {formatProgressionStatus(entry.progression.status)}
                  </span>
                  <span className="text-xs text-slate-500">Score: {entry.score.toFixed(1)}</span>
                </div>
              </header>

              <div className="space-y-2">
                <div className="h-2 rounded-full bg-slate-800/70" aria-hidden>
                  <div className="h-full rounded-full bg-cyan-400" style={{ width: `${entry.progressPercent}%` }} />
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="flex items-center gap-1 text-cyan-200">
                    <FlagIcon className="w-3.5 h-3.5" /> {entry.progressPercent}% toward {entry.nextStage ? entry.nextStage.label : 'Legacy'}
                  </span>
                  {entry.nextStage && (
                    <span className="text-slate-500">Next unlock: {entry.nextStage.description}</span>
                  )}
                </p>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-slate-300">
                <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2">
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Traits logged</dt>
                  <dd className="text-base font-semibold text-slate-100">{entry.traitCount}</dd>
                </div>
                <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2">
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Bio words</dt>
                  <dd className="text-base font-semibold text-slate-100">{entry.bioWordCount}</dd>
                </div>
                <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2">
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Key beats linked</dt>
                  <dd className="text-base font-semibold text-slate-100">{entry.narrativeLinks.length + entry.timelineLinks.length}</dd>
                </div>
              </dl>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recommended next moves</p>
                <ul className="space-y-1 text-sm text-slate-300">
                  {entry.suggestions.map((suggestion) => (
                    <li key={suggestion} className="flex items-start gap-2">
                      <span className="mt-1">
                        <ShareIcon className="w-3.5 h-3.5 text-cyan-300" />
                      </span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current beats</p>
                {keyBeats.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {keyBeats.map((beat) => (
                      <li
                        key={beat.id}
                        className="rounded-md border border-slate-700/60 bg-slate-900/80 px-2 py-1 text-xs text-slate-300"
                      >
                        {beat.title}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">No scenes or chapters linked yet.</p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default CharacterArcTracker;

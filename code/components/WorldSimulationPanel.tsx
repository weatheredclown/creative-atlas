import React, { useMemo } from 'react';
import { Artifact } from '../types';
import {
  ConstraintAnnotation,
  ConstraintStatus,
  ConstraintType,
  FactionConflictSummary,
  FactionStability,
  WorldAgeProgression,
  deriveWorldSimulationSnapshot,
} from '../utils/worldSimulation';
import { AlertTriangleIcon, FlagIcon, MapPinIcon, SparklesIcon } from './Icons';

interface WorldSimulationPanelProps {
  projectTitle: string;
  artifacts: Artifact[];
  onSelectArtifact: (artifactId: string) => void;
}

const STATUS_STYLE: Record<ConstraintStatus, string> = {
  stable: 'bg-emerald-500/10 text-emerald-200 border-emerald-400/40',
  volatile: 'bg-amber-500/10 text-amber-200 border-amber-400/50',
  forbidden: 'bg-rose-500/10 text-rose-200 border-rose-500/50',
  unknown: 'bg-slate-700/60 text-slate-300 border-slate-600/60',
};

const TYPE_LABEL: Record<ConstraintType, string> = {
  physics: 'Physics',
  metaphysics: 'Metaphysics',
};

const STABILITY_STYLE: Record<FactionStability, string> = {
  stable: 'bg-emerald-500/10 text-emerald-200 border-emerald-400/40',
  shifting: 'bg-amber-500/10 text-amber-200 border-amber-400/40',
  volatile: 'bg-rose-500/10 text-rose-200 border-rose-500/50',
};

const WorldSimulationPanel: React.FC<WorldSimulationPanelProps> = ({ projectTitle, artifacts, onSelectArtifact }) => {
  const snapshot = useMemo(() => deriveWorldSimulationSnapshot(artifacts), [artifacts]);
  const { constraints, ageProgression, factions } = snapshot;

  return (
    <section className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-cyan-500/20 border border-cyan-400/40 p-2 text-cyan-200">
            <SparklesIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300/90">World Simulation</p>
            <h3 className="text-xl font-semibold text-slate-100">Systems pulse in {projectTitle}</h3>
            <p className="text-sm text-slate-400">
              Track the rules that govern reality, how time is aging the world, and which factions are ready to spark conflict.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ConstraintColumn constraints={constraints} onSelectArtifact={onSelectArtifact} />
        <AgeColumn ageProgression={ageProgression} />
        <FactionColumn factions={factions} onSelectArtifact={onSelectArtifact} />
      </div>
    </section>
  );
};

const ConstraintColumn: React.FC<{
  constraints: ConstraintAnnotation[];
  onSelectArtifact: (artifactId: string) => void;
}> = ({ constraints, onSelectArtifact }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 text-slate-200">
      <AlertTriangleIcon className="w-5 h-5 text-amber-300" />
      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Constraint annotations</h4>
    </div>
    <div className="space-y-3">
      {constraints.length === 0 ? (
        <p className="text-sm text-slate-400">
          No simulation constraints flagged yet. Build timelines, locations, or magic codices to surface tensions.
        </p>
      ) : (
        constraints.map((constraint) => (
          <article
            key={constraint.id}
            className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-4 space-y-3 shadow-lg shadow-slate-950/20"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide border ${STATUS_STYLE[constraint.status]}`}
                  >
                    {constraint.status === 'stable' ? 'Stable' : constraint.status === 'unknown' ? 'Unknown' : constraint.status}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-600/60 bg-slate-800/60 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                    {TYPE_LABEL[constraint.type]}
                  </span>
                </div>
                <h5 className="text-base font-semibold text-slate-100">{constraint.label}</h5>
                <p className="text-sm text-slate-300">{constraint.summary}</p>
                {constraint.detail && <p className="text-xs text-slate-500">{constraint.detail}</p>}
              </div>
              {constraint.relatedArtifactIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => onSelectArtifact(constraint.relatedArtifactIds[0]!)}
                  className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                >
                  View
                </button>
              )}
            </div>
          </article>
        ))
      )}
    </div>
  </div>
);

const AgeColumn: React.FC<{ ageProgression: WorldAgeProgression }> = ({ ageProgression }) => {
  const { currentAge, upcomingAge, eras, lastRecordedYear } = ageProgression;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-slate-200">
        <MapPinIcon className="w-5 h-5 text-violet-300" />
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">World age progression</h4>
      </div>
      {eras.length === 0 ? (
        <p className="text-sm text-slate-400">
          Chronicle timeline events with dates to unlock how the world ages over centuries.
        </p>
      ) : (
        <div className="space-y-4">
          {currentAge && (
            <div className="rounded-xl border border-violet-500/40 bg-violet-500/10 p-4 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-200">Current age</p>
              <p className="text-lg font-semibold text-slate-100">{currentAge.label}</p>
              <p className="text-sm text-slate-200">
                Anchored by <span className="font-semibold">{currentAge.signature}</span>
                {lastRecordedYear !== null ? ` · Last recorded year ${lastRecordedYear}` : ''}
              </p>
            </div>
          )}
          {upcomingAge && (
            <div className="rounded-xl border border-amber-400/50 bg-amber-500/10 p-4 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">Projected next age</p>
              <p className="text-base font-semibold text-slate-100">{upcomingAge.label}</p>
              <p className="text-sm text-slate-200">
                Awaiting key events to define this era&apos;s tone.
              </p>
            </div>
          )}
          <div className="space-y-3">
            {eras.map((era) => (
              <article
                key={`${era.label}-${era.start}-${era.end}`}
                className="rounded-lg border border-slate-700/60 bg-slate-900/70 p-3 space-y-1"
              >
                <div className="flex items-center justify-between text-sm text-slate-200">
                  <span className="font-semibold">{era.label}</span>
                  <span className="text-xs text-slate-400">
                    {era.start}
                    {era.end !== null && era.end !== era.start ? ` – ${era.end}` : ''}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{era.eventCount} documented event{era.eventCount === 1 ? '' : 's'}</p>
                {era.relatedEventTitles.length > 0 && (
                  <p className="text-xs text-slate-500">
                    Highlights: {era.relatedEventTitles.join(' · ')}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const FactionColumn: React.FC<{
  factions: FactionConflictSummary[];
  onSelectArtifact: (artifactId: string) => void;
}> = ({ factions, onSelectArtifact }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 text-slate-200">
      <FlagIcon className="w-5 h-5 text-emerald-300" />
      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Faction & conflict web</h4>
    </div>
    {factions.length === 0 ? (
      <p className="text-sm text-slate-400">
        Map at least one faction artifact to begin tracking alliances and rivalries.
      </p>
    ) : (
      <div className="space-y-3">
        {factions.map((faction) => (
          <article
            key={faction.id}
            className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-4 space-y-3 shadow-lg shadow-slate-950/20"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h5 className="text-base font-semibold text-slate-100">{faction.factionName}</h5>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide border ${STABILITY_STYLE[faction.stability]}`}
                  >
                    {faction.stability === 'stable'
                      ? 'Stable'
                      : faction.stability === 'shifting'
                        ? 'Shifting'
                        : 'Volatile'}
                  </span>
                </div>
                <p className="text-sm text-slate-300">{faction.summary}</p>
              </div>
              <button
                type="button"
                onClick={() => onSelectArtifact(faction.relatedArtifactId)}
                className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
              >
                Open
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 text-xs text-slate-400 sm:grid-cols-3">
              <FactionList title="Allies" items={faction.alliances} />
              <FactionList title="Rivals" items={faction.rivalries} />
              <FactionList title="Tensions" items={faction.tensions} />
            </div>
          </article>
        ))}
      </div>
    )}
  </div>
);

const FactionList: React.FC<{ title: string; items: string[] }> = ({ title, items }) => (
  <div className="space-y-1">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
    {items.length === 0 ? (
      <p className="text-xs text-slate-600">—</p>
    ) : (
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="text-slate-300">
            {item}
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default WorldSimulationPanel;

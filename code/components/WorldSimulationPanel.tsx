import React, { useMemo } from 'react';
import { Artifact } from '../types';
import {
  analyzeWorldSimulation,
  ConstraintAnnotation,
  ConstraintStatus,
  ConstraintType,
  deriveWorldSimulationSnapshot,
  FactionConflictSummary,
  FactionStability,
  formatSpanYears,
  formatWorldAgeRange,
  WorldAgeProgression,
  WorldSimulationAnalysis,
} from '../utils/worldSimulation';
import {
  AlertTriangleIcon,
  CalendarIcon,
  FlagIcon,
  MapPinIcon,
  ShareIcon,
  SparklesIcon,
} from './Icons';
import SimulatedHistoryHeatmap from '../features/history/SimulatedHistoryHeatmap';

interface WorldSimulationPanelProps {
  artifacts: Artifact[];
  allArtifacts: Artifact[];
  projectTitle: string;
  onSelectArtifact?: (artifactId: string) => void;
}

const badgeClassNames = {
  anchor: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/60',
  crossWorld: 'bg-violet-500/20 text-violet-200 border-violet-400/60',
  linking: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/60',
};

const constraintStatusClassNames: Record<ConstraintStatus, string> = {
  stable: 'bg-emerald-500/10 text-emerald-200 border-emerald-400/40',
  volatile: 'bg-amber-500/10 text-amber-200 border-amber-400/50',
  forbidden: 'bg-rose-500/10 text-rose-200 border-rose-500/50',
  unknown: 'bg-slate-700/60 text-slate-300 border-slate-600/60',
};

const constraintTypeLabels: Record<ConstraintType, string> = {
  physics: 'Physics',
  metaphysics: 'Metaphysics',
};

const factionStabilityClassNames: Record<FactionStability, string> = {
  stable: 'bg-emerald-500/10 text-emerald-200 border-emerald-400/40',
  shifting: 'bg-amber-500/10 text-amber-200 border-amber-400/40',
  volatile: 'bg-rose-500/10 text-rose-200 border-rose-500/50',
};

const WorldSimulationPanel: React.FC<WorldSimulationPanelProps> = ({
  artifacts,
  allArtifacts,
  projectTitle,
  onSelectArtifact,
}) => {
  const analysis = useMemo<WorldSimulationAnalysis>(
    () => analyzeWorldSimulation(artifacts, allArtifacts),
    [artifacts, allArtifacts],
  );

  const snapshot = useMemo(() => deriveWorldSimulationSnapshot(artifacts), [artifacts]);

  const { worldAge, magicConstraints, factionNetwork, npcMemory } = analysis;
  const { constraints, ageProgression, factions } = snapshot;

  const hasNpcSignal = npcMemory.entries.length > 0;

  if (!analysis.hasData) {
    return (
      <section className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 space-y-4">
        <header className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/40 p-2 text-emerald-200">
            <SparklesIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200/80">World Simulation Layer</p>
            <h3 className="text-lg font-semibold text-slate-100">Build the world memory engine</h3>
            <p className="text-sm text-slate-400">
              Log timeline beats, codify arcane constraints, and link factions or characters to unlock progression insights.
            </p>
          </div>
        </header>
        <p className="text-sm text-slate-400">
          Add a timeline, magic system, or faction artifact to see continuity tracking come alive for {projectTitle}.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 space-y-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-200/80">
          <SparklesIcon className="w-4 h-4" /> World Simulation Layer
        </div>
        <h3 className="text-lg font-semibold text-slate-100">Temporal gravity, codex constraints, and memory signals</h3>
        <p className="text-sm text-slate-400">
          See how eras, rules, factions, and NPC ties reinforce the canon. Use this to enforce physics, track drift, and plan new arcs.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SummaryCard
          icon={<CalendarIcon className="w-5 h-5 text-emerald-300" />}
          title="Temporal coverage"
          value={formatWorldAgeRange(worldAge)}
          detail={formatSpanYears(worldAge)}
        />
        <SummaryCard
          icon={<SparklesIcon className="w-5 h-5 text-violet-300" />}
          title="Annotated codices"
          value={`${magicConstraints.annotatedCodexCount} of ${magicConstraints.codexCount}`}
          detail={
            magicConstraints.annotatedCodexCount > 0
              ? 'Volatile laws and taboos documented.'
              : 'Add volatile rules or taboos to lock canon.'
          }
        />
        <SummaryCard
          icon={<ShareIcon className="w-5 h-5 text-amber-300" />}
          title="Faction ties"
          value={`${factionNetwork.factionsWithLinks} of ${factionNetwork.factionCount}`}
          detail={
            factionNetwork.factionsWithLinks > 0
              ? `${factionNetwork.crossFactionLinks} conflict thread${factionNetwork.crossFactionLinks === 1 ? '' : 's'}`
              : 'Link factions to characters or rival groups.'
          }
        />
        <SummaryCard
          icon={<MapPinIcon className="w-5 h-5 text-cyan-300" />}
          title="NPC anchors"
          value={`${npcMemory.anchoredCount} of ${npcMemory.totalNpcCount}`}
          detail={
            npcMemory.crossWorldActors > 0
              ? `${npcMemory.crossWorldActors} cross-world bridge${npcMemory.crossWorldActors === 1 ? '' : 's'}`
              : 'Build ties so cast memories persist.'
          }
        />
      </div>

      <SimulatedHistoryHeatmap artifacts={artifacts} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ConstraintColumn constraints={constraints} onSelectArtifact={onSelectArtifact} />
        <AgeColumn ageProgression={ageProgression} summary={worldAge} />
        <FactionColumn factions={factions} onSelectArtifact={onSelectArtifact} />
      </div>

      <section className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-4 space-y-3">
        <header className="flex items-center gap-3">
          <div className="rounded-lg bg-slate-950/60 p-2 text-cyan-200 border border-cyan-400/40">
            <MapPinIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100">NPC memory map</h4>
            <p className="text-xs text-cyan-200/80">Who remembers what, and where their ties reach.</p>
          </div>
        </header>
        {hasNpcSignal ? (
          <div className="space-y-3 text-sm text-cyan-50">
            {npcMemory.entries.map((entry) => {
              const status = determineNpcStatus(entry);
              return (
                <article key={entry.id} className="rounded-lg border border-cyan-400/30 bg-slate-950/60 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{entry.title}</p>
                      <p className="text-xs text-slate-400">{entry.type}</p>
                    </div>
                    <span className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md border ${status.badge}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {entry.relationCount} link{entry.relationCount === 1 ? '' : 's'} · {entry.crossWorldCount}{' '}
                    cross-world bridge{entry.crossWorldCount === 1 ? '' : 's'}
                  </p>
                  {entry.linkedArtifacts.length > 0 && (
                    <p className="text-[11px] text-slate-500">Links: {entry.linkedArtifacts.join(', ')}</p>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-cyan-100/80">
            Link characters and factions to story beats, magic systems, or locations to persist their memories across the atlas.
          </p>
        )}
      </section>
    </section>
  );
};

const ConstraintColumn: React.FC<{
  constraints: ConstraintAnnotation[];
  onSelectArtifact?: (artifactId: string) => void;
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
        constraints.map((constraint) => {
          const relatedId = constraint.relatedArtifactIds[0];
          return (
            <article
              key={constraint.id}
              className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-4 space-y-3 shadow-lg shadow-slate-950/20"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide border ${constraintStatusClassNames[constraint.status]}`}
                    >
                      {constraint.status === 'stable'
                        ? 'Stable'
                        : constraint.status === 'unknown'
                          ? 'Unknown'
                          : constraint.status}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-600/60 bg-slate-800/60 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                      {constraintTypeLabels[constraint.type]}
                    </span>
                  </div>
                  <h5 className="text-base font-semibold text-slate-100">{constraint.label}</h5>
                  <p className="text-sm text-slate-300">{constraint.summary}</p>
                  {constraint.detail && <p className="text-xs text-slate-500">{constraint.detail}</p>}
                </div>
                {onSelectArtifact && relatedId && (
                  <button
                    type="button"
                    onClick={() => onSelectArtifact(relatedId)}
                    className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                  >
                    View
                  </button>
                )}
              </div>
            </article>
          );
        })
      )}
    </div>
  </div>
);

const AgeColumn: React.FC<{
  ageProgression: WorldAgeProgression;
  summary: WorldSimulationAnalysis['worldAge'];
}> = ({ ageProgression, summary }) => {
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
          <div className="rounded-xl border border-violet-500/40 bg-violet-500/10 p-4 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-200">Recorded span</p>
            <p className="text-lg font-semibold text-slate-100">{formatWorldAgeRange(summary)}</p>
            <p className="text-xs text-slate-200">{formatSpanYears(summary)}</p>
            {summary.densestTimeline && (
              <p className="text-[11px] text-violet-200/80">
                Most active: {summary.densestTimeline.title} ({summary.densestTimeline.eventCount} events)
              </p>
            )}
          </div>
          {currentAge && (
            <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Current age</p>
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
              <p className="text-sm text-slate-200">Awaiting key events to define this era&apos;s tone.</p>
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
                  <p className="text-xs text-slate-500">Highlights: {era.relatedEventTitles.join(' · ')}</p>
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
  onSelectArtifact?: (artifactId: string) => void;
}> = ({ factions, onSelectArtifact }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 text-slate-200">
      <FlagIcon className="w-5 h-5 text-emerald-300" />
      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Faction & conflict web</h4>
    </div>
    {factions.length === 0 ? (
      <p className="text-sm text-slate-400">Map at least one faction artifact to begin tracking alliances and rivalries.</p>
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
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide border ${factionStabilityClassNames[faction.stability]}`}
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
              {onSelectArtifact && (
                <button
                  type="button"
                  onClick={() => onSelectArtifact(faction.relatedArtifactId)}
                  className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                >
                  Open
                </button>
              )}
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

interface SummaryCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  detail: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, title, value, detail }) => (
  <article className="rounded-xl border border-slate-700/60 bg-slate-950/50 p-4 space-y-2">
    <div className="flex items-center gap-2 text-sm text-slate-300">
      {icon}
      <span className="font-semibold text-slate-200">{title}</span>
    </div>
    <p className="text-xl font-semibold text-white">{value}</p>
    <p className="text-xs text-slate-400">{detail}</p>
  </article>
);

const determineNpcStatus = (
  entry: ReturnType<typeof analyzeWorldSimulation>['npcMemory']['entries'][number],
): { label: string; badge: string } => {
  if (entry.crossWorldCount > 0) {
    return { label: 'Cross-world anchor', badge: badgeClassNames.crossWorld };
  }
  if (entry.relationCount >= 3) {
    return { label: 'Anchored', badge: badgeClassNames.anchor };
  }
  if (entry.relationCount > 0) {
    return { label: 'Linking', badge: badgeClassNames.linking };
  }
  return { label: 'Drifting', badge: 'bg-slate-800/60 text-slate-300 border-slate-600/70' };
};

export default WorldSimulationPanel;

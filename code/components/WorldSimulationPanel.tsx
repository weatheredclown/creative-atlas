import React, { useMemo } from 'react';
import { Artifact } from '../types';
import {
  analyzeWorldSimulation,
  formatSpanYears,
  formatWorldAgeRange,
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

interface WorldSimulationPanelProps {
  artifacts: Artifact[];
  allArtifacts: Artifact[];
  projectTitle: string;
}

const badgeClassNames = {
  anchor: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/60',
  crossWorld: 'bg-violet-500/20 text-violet-200 border-violet-400/60',
  linking: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/60',
};

const WorldSimulationPanel: React.FC<WorldSimulationPanelProps> = ({ artifacts, allArtifacts, projectTitle }) => {
  const analysis = useMemo<WorldSimulationAnalysis>(() => analyzeWorldSimulation(artifacts, allArtifacts), [
    artifacts,
    allArtifacts,
  ]);

  const { worldAge, magicConstraints, factionNetwork, npcMemory } = analysis;

  const hasMagicSignal = magicConstraints.codexCount > 0;
  const hasFactionSignal = factionNetwork.factionCount > 0;
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

      <article className="rounded-xl border border-slate-700/60 bg-slate-950/60 p-5 space-y-4">
        <header className="flex items-start gap-3">
          <div className="rounded-lg bg-emerald-500/15 border border-emerald-400/40 p-2 text-emerald-200">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-slate-100">World age progression</h4>
            <p className="text-xs text-slate-400">Track the span of recorded history and the densest eras of activity.</p>
          </div>
        </header>
        {worldAge.timelineCount === 0 ? (
          <p className="text-sm text-slate-400">Seed a timeline to chart how this world evolves across centuries.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-slate-300">
              <div>
                <p className="font-semibold text-slate-100">{formatWorldAgeRange(worldAge)}</p>
                <p className="text-xs text-slate-400">{formatSpanYears(worldAge)}</p>
              </div>
              {worldAge.densestTimeline && (
                <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-200/80">Most active timeline</p>
                  <p className="text-sm font-semibold text-emerald-100">{worldAge.densestTimeline.title}</p>
                  <p className="text-[11px] text-emerald-200/70">{worldAge.densestTimeline.eventCount} logged events</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {worldAge.eraBuckets.length > 0 ? (
                worldAge.eraBuckets.slice(0, 5).map((bucket) => (
                  <div key={bucket.label} className="flex items-center justify-between text-sm text-slate-300">
                    <span>{bucket.label}</span>
                    <span className="text-slate-400">{bucket.count} event{bucket.count === 1 ? '' : 's'}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Events lack precise dates—annotate years to unlock era insights.</p>
              )}
            </div>
          </div>
        )}
      </article>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 space-y-3">
          <header className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-950/60 p-2 text-violet-200 border border-violet-400/40">
              <SparklesIcon className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-100">Arcane constraint log</h4>
              <p className="text-xs text-violet-200/80">Volatile laws, forbidden threads, and enforced taboos.</p>
            </div>
          </header>
          {hasMagicSignal ? (
            <div className="space-y-3 text-sm text-violet-100">
              {magicConstraints.volatilePrinciples.slice(0, 3).map(({ codexId, codexTitle, principle }) => (
                <article key={`${codexId}-${principle.id}`} className="rounded-lg border border-violet-400/40 bg-slate-950/60 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-200/80">Volatile Principle</p>
                  <p className="text-sm font-semibold text-slate-100">{principle.title}</p>
                  <p className="text-xs text-slate-400">{principle.focus}</p>
                  <p className="text-xs text-slate-500 mt-1">Codex: {codexTitle}</p>
                </article>
              ))}
              {magicConstraints.forbiddenPrinciples.slice(0, 2).map(({ codexId, codexTitle, principle }) => (
                <article key={`${codexId}-forbidden-${principle.id}`} className="rounded-lg border border-rose-400/40 bg-rose-500/10 p-3">
                  <div className="flex items-center justify-between text-xs text-rose-200/90">
                    <span className="font-semibold uppercase tracking-wide">Forbidden Law</span>
                    <AlertTriangleIcon className="w-4 h-4" />
                  </div>
                  <p className="text-sm font-semibold text-rose-50">{principle.title}</p>
                  <p className="text-xs text-rose-100/80">{principle.focus}</p>
                  <p className="text-[11px] text-rose-100/70 mt-1">Codex: {codexTitle}</p>
                </article>
              ))}
              {magicConstraints.taboos.slice(0, 3).map(({ codexId, codexTitle, taboo }) => (
                <article key={`${codexId}-taboo-${taboo.id}`} className="rounded-lg border border-violet-400/30 bg-slate-950/60 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-200/70">Taboo</p>
                  <p className="text-sm font-semibold text-slate-100">{taboo.rule}</p>
                  <p className="text-xs text-slate-400">Consequence: {taboo.consequence}</p>
                  {taboo.restoration && <p className="text-[11px] text-slate-500 mt-1">Restoration: {taboo.restoration}</p>}
                  <p className="text-[11px] text-slate-500 mt-1">Codex: {codexTitle}</p>
                </article>
              ))}
              {magicConstraints.volatilePrinciples.length === 0 &&
                magicConstraints.forbiddenPrinciples.length === 0 &&
                magicConstraints.taboos.length === 0 && (
                  <p className="text-sm text-violet-100/80">
                    Document volatile or forbidden principles and taboos to enforce your metaphysics.
                  </p>
                )}
            </div>
          ) : (
            <p className="text-sm text-violet-100/80">
              Capture a magic system to surface the canon rules that bind your world.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 space-y-3">
          <header className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-950/60 p-2 text-amber-200 border border-amber-400/40">
              <FlagIcon className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-100">Faction tension grid</h4>
              <p className="text-xs text-amber-200/80">Relationships, rivalries, and pressure valves.</p>
            </div>
          </header>
          {hasFactionSignal ? (
            <div className="space-y-3 text-sm text-amber-100">
              {factionNetwork.densestFaction ? (
                <div className="rounded-lg border border-amber-400/40 bg-slate-950/60 p-3 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/80">Network hub</p>
                  <p className="text-sm font-semibold text-slate-100">{factionNetwork.densestFaction.title}</p>
                  <p className="text-xs text-slate-400">
                    {factionNetwork.densestFaction.tieCount} ties · {factionNetwork.densestFaction.factionConflicts} faction conflict
                    {factionNetwork.densestFaction.factionConflicts === 1 ? '' : 's'}
                  </p>
                  {factionNetwork.densestFaction.notableLinks.length > 0 && (
                    <p className="text-[11px] text-slate-500">
                      Links: {factionNetwork.densestFaction.notableLinks.join(', ')}
                    </p>
                  )}
                </div>
              ) : null}
              {factionNetwork.factionEntries.map((entry) => (
                <article key={entry.id} className="rounded-lg border border-amber-400/30 bg-slate-950/50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-100">{entry.title}</p>
                    <span className="text-[11px] text-amber-200/80 uppercase tracking-wide">{entry.tieCount} link{entry.tieCount === 1 ? '' : 's'}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {entry.factionConflicts} faction conflict{entry.factionConflicts === 1 ? '' : 's'}
                  </p>
                  {entry.notableLinks.length > 0 && (
                    <p className="text-[11px] text-slate-500 mt-1">Links: {entry.notableLinks.join(', ')}</p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm text-amber-100/80">
              Add a faction artifact and relate it to characters, locations, or rival groups to map conflict pressure.
            </p>
          )}
        </section>
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

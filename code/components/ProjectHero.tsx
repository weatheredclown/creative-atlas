import React from 'react';
import { Artifact, Project } from '../types';
import { PlusIcon, SparklesIcon, BuildingStorefrontIcon } from './Icons';

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
}

const StatPill: React.FC<{ label: string; value: number; tone?: 'default' | 'accent' }> = ({ label, value, tone = 'default' }) => (
  <div
    className={`rounded-2xl border px-4 py-3 shadow-sm transition-transform hover:-translate-y-0.5 ${
      tone === 'accent'
        ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100'
        : 'border-slate-600/60 bg-slate-900/70 text-slate-200'
    }`}
  >
    <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
    <p className="text-2xl font-semibold text-white">{formatNumber(value)}</p>
  </div>
);

const QuickFactCard: React.FC<{ fact: Artifact; onSelect: (id: string) => void }> = ({ fact, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(fact.id)}
    className="group flex flex-col gap-1 rounded-xl border border-slate-700/60 bg-slate-900/70 p-4 text-left transition-all hover:-translate-y-1 hover:border-cyan-500/60 hover:bg-slate-900/80"
  >
    <span className="text-[11px] font-semibold uppercase tracking-wide text-cyan-300/80">Quick Fact</span>
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
}) => {
  const hasQuickFacts = quickFacts.length > 0;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 sm:p-8 text-slate-100 shadow-xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_55%)]" aria-hidden />
      <div className="relative grid gap-8 lg:grid-cols-[1.75fr,1fr]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-100">
              {statusLabel}
            </span>
            <span className="rounded-full border border-slate-600/60 bg-slate-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
              Level {level} · {xpProgress} XP toward next
            </span>
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
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{project.title}</h2>
            {project.summary && (
              <p className="max-w-2xl text-sm text-slate-300 sm:text-base">{project.summary}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onCreateArtifact}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition-all hover:-translate-y-0.5 hover:border-cyan-300/70 hover:bg-cyan-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
            >
              <PlusIcon className="h-4 w-4" />
              New artifact
            </button>
            <button
              type="button"
              onClick={onCaptureQuickFact}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100 transition-all hover:-translate-y-0.5 hover:border-amber-300/60 hover:bg-amber-500/20 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            >
              <SparklesIcon className="h-4 w-4" />
              Capture fact
            </button>
            <button
              type="button"
              onClick={onPublishProject}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition-all hover:-translate-y-0.5 hover:border-emerald-300/60 hover:bg-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            >
              <BuildingStorefrontIcon className="h-4 w-4" />
              Publish atlas
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <StatPill label="Artifacts" value={stats.totalArtifacts} tone="accent" />
            <StatPill label="Completed tasks" value={stats.completedTasks} />
            <StatPill label="Relationships" value={stats.relationCount} />
            <StatPill label="Distinct tags" value={stats.uniqueTagCount} />
            <StatPill label="Narrative pieces" value={stats.narrativeCount} />
            <StatPill label="Wiki words" value={stats.wikiWordCount} />
            <StatPill label="Lexemes" value={stats.lexemeCount} />
            <StatPill label="Quick facts" value={stats.quickFactCount} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-600/60 bg-slate-900/70 p-5 shadow-lg">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Latest quick facts</h3>
            <p className="mt-1 text-xs text-slate-500">{totalQuickFacts} saved so far</p>
            <div className="mt-4 grid gap-3">
              {hasQuickFacts ? (
                quickFacts.map((fact) => (
                  <QuickFactCard key={fact.id} fact={fact} onSelect={onSelectQuickFact} />
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-600/60 bg-slate-900/80 p-4 text-xs text-slate-400">
                  Capture your first lore spark to build a quick reference shelf.
                </div>
              )}
            </div>
            {!hasQuickFacts && (
              <button
                type="button"
                onClick={onCaptureQuickFact}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:border-amber-300/60 hover:bg-amber-500/20"
              >
                <SparklesIcon className="h-3.5 w-3.5" />
                Add your first fact
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProjectHero;

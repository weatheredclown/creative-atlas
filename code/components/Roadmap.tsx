import React from 'react';
import { FlagIcon, SparklesIcon, CheckCircleIcon } from './Icons';
import { MilestoneProgressOverview, ObjectiveStatus } from '../utils/milestoneProgress';

interface RoadmapProps {
  items: MilestoneProgressOverview[];
}

const statusCopy: Record<ObjectiveStatus, string> = {
  complete: 'Complete',
  'in-progress': 'In progress',
  'not-started': 'Queued',
};

const Roadmap: React.FC<RoadmapProps> = ({ items }) => {
  return (
    <section className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 space-y-6">
      <header className="flex items-center gap-3">
        <FlagIcon className="w-5 h-5 text-amber-400" />
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Milestone Roadmap</h3>
          <p className="text-sm text-slate-400">
            Track how Creative Atlas levels up across the first 16 weeks. Each milestone unlocks new layers of the creative stack.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map(({ milestone, objectives, completion }) => {
          const completionPercent = Math.min(100, Math.max(0, Math.round(completion * 100)));

          return (
            <article
              key={milestone.id}
              className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-4 space-y-3 shadow-lg shadow-slate-950/20"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{milestone.timeline}</p>
                  <h4 className="text-lg font-semibold text-slate-200">{milestone.title}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">{completionPercent}%</span>
                  <SparklesIcon className="w-5 h-5 text-violet-400" />
                </div>
              </div>
              <p className="text-sm text-slate-400">{milestone.focus}</p>
              <div className="h-1.5 rounded-full bg-slate-800/60">
                <div
                  className="h-full rounded-full bg-cyan-400/80"
                  style={{ width: `${completionPercent}%` }}
                  aria-hidden
                />
              </div>
              <ul className="space-y-2 text-sm text-slate-300">
                {objectives.map((objective) => (
                  <li
                    key={objective.id}
                    className="flex items-start gap-3 bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2"
                  >
                    <StatusBadge status={objective.status} />
                    <div className="space-y-1">
                      <p className="font-medium text-slate-100">{objective.description}</p>
                      {objective.detail && (
                        <p className="text-xs text-slate-400">{objective.detail}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
};

const StatusBadge: React.FC<{ status: ObjectiveStatus }> = ({ status }) => {
  if (status === 'complete') {
    return (
      <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300">
        <CheckCircleIcon className="h-5 w-5" />
        <span className="sr-only">{statusCopy[status]}</span>
      </span>
    );
  }

  if (status === 'in-progress') {
    return (
      <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-amber-400/60 bg-amber-400/10 text-amber-300">
        <SparklesIcon className="h-4 w-4" />
        <span className="sr-only">{statusCopy[status]}</span>
      </span>
    );
  }

  return (
    <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-slate-600 text-slate-400">
      <span className="text-xs font-semibold uppercase tracking-wide">•</span>
      <span className="sr-only">{statusCopy[status]}</span>
    </span>
  );
};

export default Roadmap;

import React, { useState } from 'react';
import { MilestoneProgressOverview, ObjectiveStatus } from '../utils/milestoneProgress';
import { FlagIcon, SparklesIcon, CheckCircleIcon, XMarkIcon, ChevronDownIcon } from './Icons';
import Zippy from './Zippy';

interface MilestoneTrackerProps {
  items: MilestoneProgressOverview[];
}

const statusLabel: Record<ObjectiveStatus, string> = {
  complete: 'Complete',
  'in-progress': 'In progress',
  'not-started': 'Not started',
};

const statusStyles: Record<ObjectiveStatus, string> = {
  complete: 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200',
  'in-progress': 'bg-amber-500/15 border-amber-400/40 text-amber-200',
  'not-started': 'bg-slate-800 border-slate-700 text-slate-400',
};

const StatusIcon: React.FC<{ status: ObjectiveStatus; className?: string }> = ({ status, className }) => {
  if (status === 'complete') {
    return <CheckCircleIcon className={className} />;
  }
  if (status === 'in-progress') {
    return <SparklesIcon className={className} />;
  }
  return <XMarkIcon className={className} />;
};

const MilestoneTracker: React.FC<MilestoneTrackerProps> = ({ items }) => {
  const [isTrackerOpen, setIsTrackerOpen] = useState(true);

  if (items.length === 0) {
    return null;
  }

  return (
    <section
      id="milestone-tracker"
      className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 space-y-6"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <FlagIcon className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Milestone tracker</h3>
            <p className="text-sm text-slate-400">
              Layer-two progress signals show how close this project is to each roadmap milestone.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsTrackerOpen((previous) => !previous)}
          className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300"
          aria-expanded={isTrackerOpen}
          aria-controls="milestone-tracker-content"
        >
          {isTrackerOpen ? 'Hide milestones' : 'Show milestones'}
          <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${isTrackerOpen ? 'rotate-180' : ''}`} />
        </button>
      </header>

      <Zippy isOpen={isTrackerOpen} id="milestone-tracker-content" className="space-y-5">
        {items.map(({ milestone, objectives, completion }) => {
          const percent = Math.round(completion * 100);

          return (
            <article
              key={milestone.id}
              className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-4 space-y-4 shadow-lg shadow-slate-950/20"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{milestone.timeline}</p>
                  <h4 className="text-lg font-semibold text-slate-200">{milestone.title}</h4>
                </div>
                <div className="text-sm font-semibold text-slate-300">
                  <span className="text-cyan-300">{percent}%</span> ready
                </div>
              </div>

              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-sky-500 to-violet-500 transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>

              <p className="text-sm text-slate-400">{milestone.focus}</p>

              <ul className="space-y-2">
                {objectives.map((objective) => (
                  <li
                    key={objective.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3 sm:flex-row sm:items-start sm:gap-3"
                  >
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusStyles[objective.status]}`}
                    >
                      <StatusIcon status={objective.status} className="w-4 h-4" />
                      {statusLabel[objective.status]}
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-200">{objective.description}</p>
                      <p className="text-xs text-slate-400 leading-relaxed">{objective.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </Zippy>
    </section>
  );
};

export default MilestoneTracker;

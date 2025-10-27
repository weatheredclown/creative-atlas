import React from 'react';
import { Milestone } from '../types';
import { FlagIcon, SparklesIcon } from './Icons';

interface RoadmapProps {
  milestones: Milestone[];
}

const Roadmap: React.FC<RoadmapProps> = ({ milestones }) => {
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
        {milestones.map((milestone) => (
          <article
            key={milestone.id}
            className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-4 space-y-3 shadow-lg shadow-slate-950/20"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{milestone.timeline}</p>
                <h4 className="text-lg font-semibold text-slate-200">{milestone.title}</h4>
              </div>
              <SparklesIcon className="w-5 h-5 text-violet-400" />
            </div>
            <p className="text-sm text-slate-400">{milestone.focus}</p>
            <ul className="space-y-2 text-sm text-slate-300">
              {milestone.objectives.map((objective) => (
                <li
                  key={objective}
                  className="flex items-start gap-2 bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2"
                >
                  <span className="mt-0.5 text-cyan-300">•</span>
                  <span>{objective}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Roadmap;

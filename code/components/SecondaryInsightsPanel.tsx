import React from 'react';
import { AIAssistant } from '../types';
import { MilestoneProgressOverview } from '../utils/milestoneProgress';
import { IntelligenceLogo, XMarkIcon } from './Icons';
import AICopilotPanel from './AICopilotPanel';
import Roadmap from './Roadmap';

interface SecondaryInsightsPanelProps {
  assistants: AIAssistant[];
  milestones: MilestoneProgressOverview[];
  isOpen: boolean;
  onClose: () => void;
}

const SecondaryInsightsPanel: React.FC<SecondaryInsightsPanelProps> = ({ assistants, milestones, isOpen, onClose }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-40 flex"
      role="dialog"
      aria-modal="true"
      aria-label="Creator insights"
    >
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur"
        aria-hidden="true"
        onClick={onClose}
      />
      <aside className="relative ml-auto h-full w-full max-w-4xl bg-slate-950/95 border-l border-slate-800 shadow-2xl shadow-slate-900/70 overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-800 bg-slate-950/95 px-6 py-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <IntelligenceLogo className="w-4 h-4 text-pink-400" />
              Creator Insights
            </div>
            <h2 className="text-xl font-semibold text-slate-100">Atlas Intelligence &amp; Milestone Lore</h2>
            <p className="text-sm text-slate-400">
              Explore opt-in Atlas Intelligence guides and revisit the milestone roadmap without crowding your main workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-sm font-semibold text-slate-300 hover:border-slate-500 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
            Close
          </button>
        </div>

        <div className="space-y-6 p-6">
          <AICopilotPanel assistants={assistants} />
          <Roadmap items={milestones} />
        </div>
      </aside>
    </div>
  );
};

export default SecondaryInsightsPanel;

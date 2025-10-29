import React from 'react';
import { AIAssistant, Milestone } from '../types';
import { SparklesIcon, XMarkIcon } from './Icons';
import AICopilotPanel from './AICopilotPanel';
import Roadmap from './Roadmap';
import MilestoneTracker from './MilestoneTracker';
import { MilestoneProgressOverview } from '../utils/milestoneProgress';

interface SecondaryInsightsPanelProps {
  assistants: AIAssistant[];
  milestones: Milestone[];
  milestoneProgress: MilestoneProgressOverview[];
  isOpen: boolean;
  onClose: () => void;
}

const SecondaryInsightsPanel: React.FC<SecondaryInsightsPanelProps> = ({
  assistants,
  milestones,
  milestoneProgress,
  isOpen,
  onClose,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-40"
      role="dialog"
      aria-modal="true"
      aria-label="Creator insights"
    >
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur"
        aria-hidden="true"
        onClick={onClose}
      />
      <div className="relative z-10 flex h-full w-full flex-col bg-slate-950/95">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 bg-slate-950/95 px-8 py-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <SparklesIcon className="w-4 h-4 text-pink-400" />
              Creator Insights
            </div>
            <h2 className="text-xl font-semibold text-slate-100">Copilots &amp; Milestone Lore</h2>
            <p className="text-sm text-slate-400">
              Review roadmap signals and optional copilots in a distraction-free fullscreen workspace.
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

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
            <MilestoneTracker items={milestoneProgress} />
            <Roadmap milestones={milestones} />
            <AICopilotPanel assistants={assistants} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecondaryInsightsPanel;

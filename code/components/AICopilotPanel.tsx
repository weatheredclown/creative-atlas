import React, { useState } from 'react';
import { AIAssistant } from '../types';
import { SparklesIcon, BookOpenIcon } from './Icons';

interface AICopilotPanelProps {
  assistants: AIAssistant[];
}

const AICopilotPanel: React.FC<AICopilotPanelProps> = ({ assistants }) => {
  const [activeId, setActiveId] = useState<string>(assistants[0]?.id ?? '');
  const activeAssistant = assistants.find((assistant) => assistant.id === activeId) ?? assistants[0];

  return (
    <section className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 space-y-5">
      <header className="flex items-center gap-3">
        <SparklesIcon className="w-5 h-5 text-pink-400" />
        <div>
          <h3 className="text-lg font-semibold text-slate-100">AI Copilots</h3>
          <p className="text-sm text-slate-400">
            Four opt-in copilots stand ready with prompt slots tuned to Creative Atlas workflows. Swap between them to preview their specialities.
          </p>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-4">
        <nav className="flex lg:flex-col gap-2 lg:w-48">
          {assistants.map((assistant) => {
            const isActive = assistant.id === activeAssistant?.id;
            return (
              <button
                key={assistant.id}
                onClick={() => setActiveId(assistant.id)}
                className={`text-left px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-pink-600/30 border-pink-500/60 text-pink-200 shadow-lg shadow-pink-900/20'
                    : 'bg-slate-900/60 border-slate-700/60 text-slate-300 hover:border-pink-400/60'
                }`}
              >
                {assistant.name}
              </button>
            );
          })}
        </nav>

        {activeAssistant && (
          <article className="flex-1 bg-slate-900/70 border border-slate-700/60 rounded-xl p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Focus</p>
              <h4 className="text-lg font-semibold text-slate-100">{activeAssistant.focus}</h4>
            </div>
            <p className="text-sm text-slate-300">{activeAssistant.description}</p>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <BookOpenIcon className="w-4 h-4 text-cyan-300" />
                Prompt Slots
              </div>
              <ul className="space-y-2 text-sm text-slate-200">
                {activeAssistant.promptSlots.map((slot) => (
                  <li key={slot} className="bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 font-mono text-xs">
                    {slot}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        )}
      </div>
    </section>
  );
};

export default AICopilotPanel;

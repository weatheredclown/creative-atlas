import React, { useEffect, useMemo, useState } from 'react';
import { AIAssistant } from '../types';
import { SparklesIcon, BookOpenIcon } from './Icons';
import { generateText } from '../services/generation';

interface AICopilotPanelProps {
  assistants: AIAssistant[];
  onGenerate?: (text: string) => void;
}

const EMPTY_PANEL_MESSAGE = 'No copilots are configured yet. Add one in your workspace settings to unlock creative prompts.';

const AICopilotPanel: React.FC<AICopilotPanelProps> = ({ assistants, onGenerate }) => {
  const [activeId, setActiveId] = useState<string>(assistants[0]?.id ?? '');
  const activeAssistant = useMemo(
    () => assistants.find((assistant) => assistant.id === activeId) ?? assistants[0],
    [assistants, activeId],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState(0);
  const [promptInput, setPromptInput] = useState(activeAssistant?.promptSlots[0] ?? '');
  const [error, setError] = useState<string | null>(null);
  const [generatedPreview, setGeneratedPreview] = useState('');

  useEffect(() => {
    setSelectedPromptIndex(0);
    setPromptInput(activeAssistant?.promptSlots[0] ?? '');
    setError(null);
    setGeneratedPreview('');
  }, [activeAssistant]);

  useEffect(() => {
    if (!assistants.some((assistant) => assistant.id === activeId) && assistants[0]) {
      setActiveId(assistants[0].id);
    }
  }, [activeId, assistants]);

  if (assistants.length === 0 || !activeAssistant) {
    return (
      <section className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 text-sm text-slate-400">
        {EMPTY_PANEL_MESSAGE}
      </section>
    );
  }

  const handleGenerateClick = async () => {
    if (!activeAssistant) return;
    const prompt = promptInput.trim();
    if (!prompt) {
      setError('Enter or select a prompt before invoking the copilot.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const generatedText = await generateText(prompt);
      setGeneratedPreview(generatedText);
      onGenerate?.(generatedText);
    } catch (err) {
      console.error('Failed to generate text:', err);
      const message = err instanceof Error ? err.message : 'Unable to reach the copilot service right now.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

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
        <nav className="flex lg:flex-col gap-2 lg:w-48" aria-label="Select an AI copilot">
          {assistants.map((assistant) => {
            const isActive = assistant.id === activeAssistant?.id;
            return (
              <button
                key={assistant.id}
                onClick={() => setActiveId(assistant.id)}
                className={`text-left px-3 py-2 rounded-lg border text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400 ${
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
          <article className="flex-1 bg-slate-900/70 border border-slate-700/60 rounded-xl p-4 space-y-4 flex flex-col">
            <div className="flex-grow space-y-4">
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
                <ul className="flex flex-wrap gap-2">
                  {activeAssistant.promptSlots.map((slot, index) => {
                    const isSelected = index === selectedPromptIndex;
                    return (
                      <li key={`${activeAssistant.id}-${index}`}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPromptIndex(index);
                            setPromptInput(slot);
                          }}
                          className={`rounded-lg border px-3 py-2 text-xs font-mono text-left transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                            isSelected
                              ? 'bg-cyan-600/20 border-cyan-500/60 text-cyan-100'
                              : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-cyan-400/60'
                          }`}
                        >
                          {slot}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="space-y-2">
                <label htmlFor="copilot-custom-prompt" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Customise prompt
                </label>
                <textarea
                  id="copilot-custom-prompt"
                  value={promptInput}
                  onChange={(event) => setPromptInput(event.target.value)}
                  className="w-full min-h-[120px] rounded-lg border border-slate-700/60 bg-slate-950/70 p-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="Describe what you want the copilot to generate."
                />
              </div>
              {error && <p className="text-sm text-rose-300">{error}</p>}
            </div>
            <div className="mt-4">
              <button
                onClick={handleGenerateClick}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors bg-cyan-600/30 border border-cyan-500/60 text-cyan-200 hover:bg-cyan-600/40 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                <SparklesIcon className="w-4 h-4" />
                {isLoading ? 'Generating...' : 'Generate'}
              </button>
            </div>
            {generatedPreview && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Latest copilot draft</p>
                <div className="rounded-lg border border-slate-800/70 bg-slate-900/70 p-3 text-sm text-slate-200 whitespace-pre-wrap">
                  {generatedPreview}
                </div>
              </div>
            )}
          </article>
        )}
      </div>
    </section>
  );
};

export default AICopilotPanel;

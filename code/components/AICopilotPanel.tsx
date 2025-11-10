import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AIAssistant, Artifact, ArtifactType, Project } from '../types';
import { IntelligenceLogo, BookOpenIcon } from './Icons';
import { generateText } from '../services/generation';
import { useUserData } from '../contexts/UserDataContext';
import { milestoneRoadmap } from '../src/data/milestones';

interface AICopilotPanelProps {
  assistants: AIAssistant[];
  onGenerate?: (text: string) => void;
}

const EMPTY_PANEL_MESSAGE =
  'Atlas Intelligence is not configured yet. Add a guide in your workspace settings to unlock creative prompts.';

interface PromptStructure {
  name: string;
  args: string[];
}

interface PlaceholderOption {
  value: string;
  label: string;
  description?: string;
}

interface PlaceholderContext {
  projects: Project[];
  artifacts: Artifact[];
  projectMap: Map<string, Project>;
}

interface PlaceholderSection {
  placeholder: string;
  index: number;
  options: PlaceholderOption[];
  currentValue: string;
  isResolved: boolean;
}

const placeholderLabels: Record<string, string> = {
  projectId: 'Project',
  artifactId: 'Artifact',
  focusArtifactId: 'Focus Artifact',
  conlangId: 'Conlang',
  milestoneId: 'Milestone',
  characterId: 'Character',
  timelineId: 'Timeline',
  sceneId: 'Scene',
  planId: 'Plan',
};

const parsePromptStructure = (input: string): PromptStructure | null => {
  const match = input.match(/^([a-z0-9_]+)\s*\((.*)\)\s*$/i);
  if (!match) {
    return null;
  }
  const [, name, argsPart] = match;
  const rawArgs = argsPart.split(',').map((argument) => argument.trim());
  const args = rawArgs.length === 1 && rawArgs[0] === '' ? [] : rawArgs;
  return { name, args };
};

const formatArtifactType = (type: ArtifactType): string => type.replace(/([a-z])([A-Z])/g, '$1 $2');

const createProjectOptions = (projects: Project[]): PlaceholderOption[] =>
  projects
    .map((project) => ({
      value: project.id,
      label: project.title,
      description: project.summary,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

const createArtifactOptions = (
  artifacts: Artifact[],
  projectMap: Map<string, Project>,
  filter?: (artifact: Artifact) => boolean,
): PlaceholderOption[] =>
  artifacts
    .filter((artifact) => (filter ? filter(artifact) : true))
    .map((artifact) => {
      const project = projectMap.get(artifact.projectId);
      const projectLabel = project ? project.title : artifact.projectId;
      const typeLabel = formatArtifactType(artifact.type);
      const summary = artifact.summary?.trim();
      const descriptionParts = [`Project: ${projectLabel}`];
      if (summary) {
        descriptionParts.push(summary);
      }
      return {
        value: artifact.id,
        label: `${artifact.title} — ${typeLabel}`,
        description: descriptionParts.join(' • '),
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

const milestoneOptions: PlaceholderOption[] = milestoneRoadmap
  .map((milestone) => ({
    value: milestone.id,
    label: milestone.title,
    description: milestone.focus,
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

const getPlaceholderOptions = (placeholder: string, context: PlaceholderContext): PlaceholderOption[] => {
  switch (placeholder) {
    case 'projectId':
      return createProjectOptions(context.projects);
    case 'artifactId':
    case 'focusArtifactId':
      return createArtifactOptions(context.artifacts, context.projectMap);
    case 'conlangId':
      return createArtifactOptions(
        context.artifacts,
        context.projectMap,
        (artifact) => artifact.type === ArtifactType.Conlang,
      );
    case 'characterId':
      return createArtifactOptions(
        context.artifacts,
        context.projectMap,
        (artifact) => artifact.type === ArtifactType.Character,
      );
    case 'timelineId':
      return createArtifactOptions(
        context.artifacts,
        context.projectMap,
        (artifact) => artifact.type === ArtifactType.Timeline,
      );
    case 'sceneId':
      return createArtifactOptions(
        context.artifacts,
        context.projectMap,
        (artifact) => artifact.type === ArtifactType.Scene,
      );
    case 'planId':
      return createArtifactOptions(
        context.artifacts,
        context.projectMap,
        (artifact) => artifact.type === ArtifactType.Task,
      );
    case 'milestoneId':
      return milestoneOptions;
    default:
      return [];
  }
};

const AICopilotPanel: React.FC<AICopilotPanelProps> = ({ assistants, onGenerate }) => {
  const { projects, artifacts } = useUserData();
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
  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const projectMap = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const slotTemplate = activeAssistant?.promptSlots[selectedPromptIndex] ?? '';
  const templateStructure = useMemo(() => parsePromptStructure(slotTemplate), [slotTemplate]);
  const currentStructure = useMemo(() => parsePromptStructure(promptInput), [promptInput]);
  const placeholderSections = useMemo(() => {
    if (!templateStructure || !currentStructure) {
      return [] as PlaceholderSection[];
    }

    if (
      templateStructure.name !== currentStructure.name ||
      templateStructure.args.length !== currentStructure.args.length
    ) {
      return [] as PlaceholderSection[];
    }

    return templateStructure.args
      .map<PlaceholderSection | null>((placeholder, index) => {
        const options = getPlaceholderOptions(placeholder, { projects, artifacts, projectMap });
        if (options.length === 0) {
          return null;
        }
        const currentValue = currentStructure.args[index] ?? placeholder;
        const isResolved = currentValue !== placeholder;
        return {
          placeholder,
          index,
          options,
          currentValue,
          isResolved,
        };
      })
      .filter((section): section is PlaceholderSection => section !== null);
  }, [templateStructure, currentStructure, projects, artifacts, projectMap]);

  const hasPlaceholderSections = placeholderSections.length > 0;

  const insertValueAtCursor = (value: string) => {
    if (!value) {
      return;
    }
    const textarea = promptTextareaRef.current;
    const fallbackPosition = promptInput.length;
    const selectionStart = textarea?.selectionStart ?? fallbackPosition;
    const selectionEnd = textarea?.selectionEnd ?? fallbackPosition;

    setPromptInput((current) => {
      const before = current.slice(0, selectionStart);
      const after = current.slice(selectionEnd);
      return `${before}${value}${after}`;
    });

    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        const target = promptTextareaRef.current;
        if (target) {
          const newPosition = selectionStart + value.length;
          target.selectionStart = newPosition;
          target.selectionEnd = newPosition;
          target.focus();
        }
      });
    }
  };

  const handlePlaceholderOptionChange = (section: PlaceholderSection, nextValue: string) => {
    if (!templateStructure) {
      insertValueAtCursor(nextValue);
      return;
    }

    const parsed = parsePromptStructure(promptInput);
    if (!parsed || parsed.name !== templateStructure.name || parsed.args.length !== templateStructure.args.length) {
      insertValueAtCursor(nextValue);
      return;
    }

    const nextArgs = [...parsed.args];
    nextArgs[section.index] = nextValue;
    setPromptInput(`${parsed.name}(${nextArgs.join(', ')})`);
    setTimeout(() => {
      promptTextareaRef.current?.focus();
    }, 0);
  };

  const handlePlaceholderReset = (section: PlaceholderSection) => {
    handlePlaceholderOptionChange(section, section.placeholder);
  };

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
      setError('Enter or select a prompt before invoking Atlas Intelligence.');
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
      const message = err instanceof Error ? err.message : 'Unable to reach the Atlas Intelligence service right now.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 space-y-5">
      <header className="flex items-center gap-3">
        <div className="flex items-center justify-center rounded-xl bg-pink-500/10 border border-pink-500/40 p-2">
          <IntelligenceLogo className="w-5 h-5 text-pink-300" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Atlas Intelligence Studio</h3>
          <p className="text-sm text-slate-400">
            Four opt-in Atlas Intelligence guides stand ready with prompt slots tuned to Creative Atlas workflows. Swap between them to preview their specialities.
          </p>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-4">
        <nav className="flex lg:flex-col gap-2 lg:w-48" aria-label="Select an Atlas Intelligence guide">
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
                <label htmlFor="atlas-intelligence-custom-prompt" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Customise prompt
                </label>
                <textarea
                  id="atlas-intelligence-custom-prompt"
                  ref={promptTextareaRef}
                  value={promptInput}
                  onChange={(event) => setPromptInput(event.target.value)}
                  className="w-full min-h-[120px] rounded-lg border border-slate-700/60 bg-slate-950/70 p-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="Describe what you want Atlas Intelligence to generate."
                />
              </div>
              {hasPlaceholderSections && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Browse your workspace
                  </p>
                  {placeholderSections.map((section) => {
                    const friendlyLabel = placeholderLabels[section.placeholder] ?? section.placeholder;
                    return (
                      <div
                        key={`${section.placeholder}-${section.index}`}
                        className="space-y-3 rounded-lg border border-slate-800/60 bg-slate-900/70 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-100">{friendlyLabel}</p>
                            <p className="text-xs text-slate-400">
                              Insert a {friendlyLabel.toLowerCase()} reference into the prompt.
                            </p>
                          </div>
                          {section.isResolved && (
                            <span className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-xs font-mono text-cyan-200">
                              {section.currentValue}
                            </span>
                          )}
                        </div>
                        <div className="grid max-h-52 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                          {section.options.map((option) => {
                            const isActive = section.currentValue === option.value;
                            return (
                              <button
                                type="button"
                                key={option.value}
                                onClick={() => handlePlaceholderOptionChange(section, option.value)}
                                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                                  isActive
                                    ? 'border-cyan-500/70 bg-cyan-600/20 text-cyan-100 shadow-inner shadow-cyan-900/20'
                                    : 'border-slate-700/60 bg-slate-900/40 text-slate-200 hover:border-cyan-400/60 hover:text-cyan-100'
                                }`}
                              >
                                <span className="text-sm font-semibold">{option.label}</span>
                                {option.description && (
                                  <span className="mt-1 block text-xs text-slate-400">{option.description}</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {section.isResolved && (
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => handlePlaceholderReset(section)}
                              className="text-xs text-slate-400 transition-colors hover:text-slate-200"
                            >
                              Reset selection
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {error && <p className="text-sm text-rose-300">{error}</p>}
            </div>
            <div className="mt-4">
              <button
                onClick={handleGenerateClick}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors bg-cyan-600/30 border border-cyan-500/60 text-cyan-200 hover:bg-cyan-600/40 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                <IntelligenceLogo className="w-4 h-4" />
                {isLoading ? 'Generating...' : 'Generate'}
              </button>
            </div>
            {generatedPreview && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Latest Atlas Intelligence draft</p>
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

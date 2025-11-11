import React, { useEffect, useMemo, useState } from 'react';
import {
  Artifact,
  type EncounterGeneratorConfig,
  type GeneratedEncounter,
  TaskData,
  TASK_STATE,
  TASK_STATE_VALUES,
  type TaskState,
} from '../types';
import { CalendarIcon, CheckCircleIcon, MapPinIcon, SparklesIcon, UserCircleIcon } from './Icons';
import {
  createEncounterConfig,
  DUSTLAND_ANCHOR_OPTIONS,
  ENCOUNTER_INTENSITY_OPTIONS,
  ENCOUNTER_OBJECTIVE_OPTIONS,
  ENCOUNTER_TONE_OPTIONS,
  generateEncounter,
  PIT_ANCHOR_OPTIONS,
  sanitizeEncounterConfig,
  sanitizeGeneratedEncounter,
} from '../utils/encounterGenerator';

interface TaskEditorProps {
  artifact: Artifact;
  onUpdateArtifactData: (artifactId: string, data: TaskData) => void;
}

const TaskEditor: React.FC<TaskEditorProps> = ({ artifact, onUpdateArtifactData }) => {
  const initialData = (artifact.data as TaskData) ?? { state: TASK_STATE.Todo };
  const [taskState, setTaskState] = useState<TaskState>(initialData.state ?? TASK_STATE.Todo);
  const [assignee, setAssignee] = useState<string>(initialData.assignee ?? '');
  const [due, setDue] = useState<string>(initialData.due ?? '');
  const [encounterConfig, setEncounterConfig] = useState<EncounterGeneratorConfig>(() =>
    sanitizeEncounterConfig(initialData.encounterConfig),
  );
  const [encounterResult, setEncounterResult] = useState<GeneratedEncounter | undefined>(() =>
    sanitizeGeneratedEncounter(initialData.generatedEncounter),
  );

  useEffect(() => {
    const currentData = (artifact.data as TaskData) ?? { state: TASK_STATE.Todo };
    setTaskState(currentData.state ?? TASK_STATE.Todo);
    setAssignee(currentData.assignee ?? '');
    setDue(currentData.due ?? '');
    setEncounterConfig(sanitizeEncounterConfig(currentData.encounterConfig));
    setEncounterResult(sanitizeGeneratedEncounter(currentData.generatedEncounter));
  }, [artifact.id, artifact.data]);

  const updateTaskData = (updates: Partial<TaskData>) => {
    const nextState = updates.state ?? taskState ?? TASK_STATE.Todo;
    const nextAssigneeRaw = 'assignee' in updates ? updates.assignee ?? '' : assignee;
    const nextDueRaw = 'due' in updates ? updates.due ?? '' : due;
    const nextConfig =
      'encounterConfig' in updates
        ? sanitizeEncounterConfig(updates.encounterConfig)
        : encounterConfig;
    const nextEncounter =
      'generatedEncounter' in updates
        ? sanitizeGeneratedEncounter(updates.generatedEncounter)
        : encounterResult;

    const nextAssignee = nextAssigneeRaw ?? '';
    const nextDue = nextDueRaw ?? '';

    setTaskState(nextState);
    setAssignee(nextAssignee);
    setDue(nextDue);
    setEncounterConfig(nextConfig);
    setEncounterResult(nextEncounter);

    onUpdateArtifactData(artifact.id, {
      state: nextState,
      assignee: nextAssignee.trim().length > 0 ? nextAssignee : undefined,
      due: nextDue.trim().length > 0 ? nextDue : undefined,
      encounterConfig: nextConfig,
      generatedEncounter: nextEncounter,
    });
  };

  const dueInsight = useMemo(() => {
    if (!due) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(due);
    if (Number.isNaN(dueDate.getTime())) {
      return {
        tone: 'neutral' as const,
        message: 'Unable to parse due date.',
      };
    }

    const dayDiff = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (dayDiff < 0) {
      return {
        tone: 'danger' as const,
        message: `Overdue by ${Math.abs(dayDiff)} day${Math.abs(dayDiff) === 1 ? '' : 's'}.`,
      };
    }

    if (dayDiff === 0) {
      return {
        tone: 'warning' as const,
        message: 'Due today. Time to ship! 🚀',
      };
    }

    if (dayDiff <= 3) {
      return {
        tone: 'warning' as const,
        message: `Due in ${dayDiff} day${dayDiff === 1 ? '' : 's'}.`,
      };
    }

    return {
      tone: 'success' as const,
      message: `Due in ${dayDiff} days. Plenty of runway.`,
    };
  }, [due]);

  const handleConfigSelectChange = <K extends keyof EncounterGeneratorConfig>(
    key: K,
  ) =>
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value as EncounterGeneratorConfig[K];
      const nextConfig = createEncounterConfig({ ...encounterConfig, [key]: value });
      updateTaskData({ encounterConfig: nextConfig });
    };

  const handleGenerateEncounter = () => {
    const result = generateEncounter(encounterConfig);
    updateTaskData({ generatedEncounter: result });
  };

  const handleClearEncounter = () => {
    updateTaskData({ generatedEncounter: undefined });
  };

  return (
    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h3 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
          <CheckCircleIcon className="w-6 h-6" />
          Quest Task Controls
        </h3>
        <div className="text-xs uppercase tracking-wide text-slate-400 bg-slate-900/60 border border-slate-700 rounded-full px-3 py-1">
          {artifact.summary || 'No task summary yet.'}
        </div>
      </div>

      <div className="space-y-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</span>
        <div className="flex flex-wrap gap-2">
          {TASK_STATE_VALUES.map((stateOption) => {
            const isActive = stateOption === taskState;
            return (
              <button
                key={stateOption}
                onClick={() => updateTaskData({ state: stateOption })}
                className={`px-3 py-1.5 text-sm font-semibold rounded-md border transition-colors ${
                  isActive
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/30'
                    : 'bg-slate-900/60 text-slate-300 border-slate-700 hover:border-emerald-400/70 hover:text-emerald-200'
                }`}
                type="button"
              >
                {stateOption}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="task-assignee" className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Assignee
          </label>
          <div className="relative">
            <UserCircleIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="task-assignee"
              type="text"
              value={assignee}
              onChange={(event) => updateTaskData({ assignee: event.target.value })}
              placeholder="Who is taking point?"
              className="w-full bg-slate-900/60 border border-slate-700 rounded-md pl-9 pr-3 py-2 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="task-due" className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Due Date
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <CalendarIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="task-due"
                type="date"
                value={due}
                onChange={(event) => updateTaskData({ due: event.target.value })}
                className="w-full bg-slate-900/60 border border-slate-700 rounded-md pl-9 pr-3 py-2 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
            </div>
            {due && (
              <button
                type="button"
                onClick={() => updateTaskData({ due: '' })}
                className="px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-700/60 hover:bg-slate-700 rounded-md transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          {dueInsight && (
            <p
              className={`text-xs mt-1 ${
                dueInsight.tone === 'danger'
                  ? 'text-red-400'
                  : dueInsight.tone === 'warning'
                  ? 'text-amber-300'
                  : dueInsight.tone === 'success'
                  ? 'text-emerald-300'
                  : 'text-slate-400'
              }`}
            >
              {dueInsight.message}
            </p>
          )}
        </div>
      </div>
      <section className="space-y-4 rounded-xl border border-emerald-500/20 bg-emerald-900/5 p-4">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-emerald-500/20 border border-emerald-400/30 p-2 text-emerald-200">
              <SparklesIcon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">
                Procedural Encounter Generator
              </p>
              <p className="text-sm text-emerald-100/80">
                Blend Dustland tech pillars with PIT factions to draft playable quest beats. Tweak the vibe, stakes, and
                influences, then spin up a fresh encounter briefing for this quest.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleGenerateEncounter}
              className="inline-flex items-center gap-2 rounded-md border border-emerald-400/60 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/30 transition-colors"
            >
              <SparklesIcon className="h-4 w-4" /> Generate encounter
            </button>
            {encounterResult && (
              <button
                type="button"
                onClick={handleClearEncounter}
                className="inline-flex items-center rounded-md border border-slate-600 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-500 hover:text-white transition-colors"
              >
                Clear result
              </button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-1 text-sm text-slate-200" htmlFor="encounter-intensity">
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Intensity</span>
            <select
              id="encounter-intensity"
              value={encounterConfig.intensity}
              onChange={handleConfigSelectChange('intensity')}
              className="w-full rounded-md border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              {ENCOUNTER_INTENSITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} — {option.description}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm text-slate-200" htmlFor="encounter-objective">
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Objective</span>
            <select
              id="encounter-objective"
              value={encounterConfig.objective}
              onChange={handleConfigSelectChange('objective')}
              className="w-full rounded-md border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              {ENCOUNTER_OBJECTIVE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} — {option.description}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm text-slate-200" htmlFor="encounter-tone">
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Tone</span>
            <select
              id="encounter-tone"
              value={encounterConfig.tone}
              onChange={handleConfigSelectChange('tone')}
              className="w-full rounded-md border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              {ENCOUNTER_TONE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} — {option.description}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm text-slate-200" htmlFor="encounter-dustland">
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Dustland Anchor</span>
            <select
              id="encounter-dustland"
              value={encounterConfig.dustlandAnchor}
              onChange={handleConfigSelectChange('dustlandAnchor')}
              className="w-full rounded-md border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              {DUSTLAND_ANCHOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} — {option.description}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm text-slate-200" htmlFor="encounter-pit">
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-200">PIT Anchor</span>
            <select
              id="encounter-pit"
              value={encounterConfig.pitAnchor}
              onChange={handleConfigSelectChange('pitAnchor')}
              className="w-full rounded-md border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              {PIT_ANCHOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} — {option.description}
                </option>
              ))}
            </select>
          </label>
        </div>

        {encounterResult ? (
          <div className="space-y-4 rounded-lg border border-emerald-400/30 bg-slate-900/70 p-4 shadow-lg shadow-emerald-500/10">
            <div className="space-y-2">
              <h4 className="text-lg font-semibold text-emerald-200">{encounterResult.title}</h4>
              <p className="flex items-start gap-2 text-sm text-emerald-100/90">
                <MapPinIcon className="mt-0.5 h-4 w-4 text-emerald-300" />
                {encounterResult.location}
              </p>
              <p className="text-sm text-slate-200">{encounterResult.briefing}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Beats</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-100">
                  {encounterResult.beats.map((beat, index) => (
                    <li
                      key={`beat-${index.toString()}`}
                      className="rounded-md border border-slate-700/60 bg-slate-800/80 px-3 py-2"
                    >
                      {beat}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Rewards</p>
                <ul className="mt-2 space-y-2 text-sm text-emerald-100">
                  {encounterResult.rewards.map((reward, index) => (
                    <li
                      key={`reward-${index.toString()}`}
                      className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2"
                    >
                      {reward}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-300">
            Configure the encounter DNA above and generate a Dustland ↔ PIT briefing tailored to this questline.
          </p>
        )}
      </section>
    </div>
  );
};

export default TaskEditor;


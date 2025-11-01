import React, { useEffect, useMemo, useState } from 'react';
import { Artifact, TaskData, TASK_STATE, TASK_STATE_VALUES, type TaskState } from '../types';
import { CalendarIcon, CheckCircleIcon, UserCircleIcon } from './Icons';

interface TaskEditorProps {
  artifact: Artifact;
  onUpdateArtifactData: (artifactId: string, data: TaskData) => void;
}

const TaskEditor: React.FC<TaskEditorProps> = ({ artifact, onUpdateArtifactData }) => {
  const initialData = (artifact.data as TaskData) ?? { state: TASK_STATE.Todo };
  const [taskState, setTaskState] = useState<TaskState>(initialData.state ?? TASK_STATE.Todo);
  const [assignee, setAssignee] = useState<string>(initialData.assignee ?? '');
  const [due, setDue] = useState<string>(initialData.due ?? '');

  useEffect(() => {
    const currentData = (artifact.data as TaskData) ?? { state: TASK_STATE.Todo };
    setTaskState(currentData.state ?? TASK_STATE.Todo);
    setAssignee(currentData.assignee ?? '');
    setDue(currentData.due ?? '');
  }, [artifact.id, artifact.data]);

  const updateTaskData = (updates: Partial<TaskData>) => {
    const next: TaskData = {
      state: taskState,
      assignee,
      due,
      ...updates,
    };
    setTaskState(next.state ?? TASK_STATE.Todo);
    setAssignee(next.assignee ?? '');
    setDue(next.due ?? '');
    onUpdateArtifactData(artifact.id, next);
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
    </div>
  );
};

export default TaskEditor;


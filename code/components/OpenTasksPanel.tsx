import React, { useMemo } from 'react';
import { Artifact, ArtifactType, TaskData, TASK_STATE, type TaskState } from '../types';

interface OpenTasksPanelProps {
  artifacts: Artifact[];
  projectTitle: string;
  onSelectTask: (taskId: string) => void;
  maxVisibleTasks?: number;
}

interface DueInfo {
  label: string;
  toneClass: string;
}

interface EnrichedTask {
  artifact: Artifact;
  data: TaskData;
  state: TaskState;
  dueDate?: Date;
  dueInfo: DueInfo;
}

const stateLabelMap: Record<TaskState, string> = {
  [TASK_STATE.Todo]: 'To Do',
  [TASK_STATE.InProgress]: 'In Progress',
  [TASK_STATE.Done]: 'Done',
};

const stateStyleMap: Record<TaskState, string> = {
  [TASK_STATE.Todo]: 'border-slate-700/60 bg-slate-800/60 text-slate-200',
  [TASK_STATE.InProgress]: 'border-amber-400/40 bg-amber-500/20 text-amber-100',
  [TASK_STATE.Done]: 'border-emerald-400/50 bg-emerald-500/20 text-emerald-100',
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const parseDueDate = (value?: string): Date | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return startOfDay(parsed);
};

const describeDueDate = (dueDate: Date | undefined, reference: Date): DueInfo => {
  if (!dueDate) {
    return { label: 'No due date', toneClass: 'text-slate-400' };
  }

  const diffInDays = Math.round((dueDate.getTime() - reference.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays < 0) {
    const daysOverdue = Math.abs(diffInDays);
    const dayLabel = daysOverdue === 1 ? 'day' : 'days';
    return {
      label: `Overdue by ${daysOverdue} ${dayLabel}`,
      toneClass: 'text-rose-300',
    };
  }

  if (diffInDays === 0) {
    return { label: 'Due today', toneClass: 'text-amber-200' };
  }

  const dayLabel = diffInDays === 1 ? 'day' : 'days';
  return {
    label: `Due in ${diffInDays} ${dayLabel}`,
    toneClass: 'text-emerald-300',
  };
};

const OpenTasksPanel: React.FC<OpenTasksPanelProps> = ({
  artifacts,
  projectTitle,
  onSelectTask,
  maxVisibleTasks = 5,
}) => {
  const { visibleTasks, counts } = useMemo(() => {
    const now = startOfDay(new Date());

    const tasks = artifacts
      .filter((artifact) => artifact.type === ArtifactType.Task)
      .map<EnrichedTask>((artifact) => {
        const data = (artifact.data as TaskData | undefined) ?? { state: TASK_STATE.Todo };
        const state = data.state ?? TASK_STATE.Todo;
        const dueDate = parseDueDate(data.due);

        return {
          artifact,
          data: { ...data, state },
          state,
          dueDate,
          dueInfo: describeDueDate(dueDate, now),
        };
      })
      .filter((task) => task.state !== TASK_STATE.Done);

    const sorted = tasks.sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }

      if (a.dueDate && !b.dueDate) {
        return -1;
      }

      if (!a.dueDate && b.dueDate) {
        return 1;
      }

      if (a.state !== b.state) {
        return a.state === TASK_STATE.InProgress ? -1 : 1;
      }

      return a.artifact.title.localeCompare(b.artifact.title);
    });

    const inProgressCount = sorted.filter((task) => task.state === TASK_STATE.InProgress).length;
    const todoCount = sorted.filter((task) => task.state === TASK_STATE.Todo).length;

    return {
      visibleTasks: sorted.slice(0, maxVisibleTasks),
      counts: {
        total: sorted.length,
        inProgress: inProgressCount,
        todo: todoCount,
      },
    };
  }, [artifacts, maxVisibleTasks]);

  if (counts.total === 0) {
    return (
      <section className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-5">
        <header className="mb-3">
          <h3 className="text-lg font-semibold text-slate-100">Open tasks</h3>
          <p className="text-xs text-slate-400">All quests complete in {projectTitle}. Forge something new!</p>
        </header>
        <p className="text-sm text-slate-500">You have no active quest tasks. Create a new task or revisit completed quests.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-5 space-y-4">
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">Open tasks</h3>
          <span className="inline-flex items-center rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">
            {counts.total} {counts.total === 1 ? 'task' : 'tasks'}
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Tracking {counts.total === 1 ? '1 open task' : `${counts.total} open tasks`} — {counts.inProgress} in progress, {counts.todo}{' '}
          queued.
        </p>
      </header>

      <ul className="space-y-3">
        {visibleTasks.map(({ artifact, data, state, dueInfo }) => (
          <li key={artifact.id}>
            <button
              type="button"
              onClick={() => onSelectTask(artifact.id)}
              className="w-full text-left rounded-lg border border-slate-800/60 bg-slate-950/40 px-4 py-3 transition-colors hover:border-cyan-500/40 hover:bg-slate-900/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-100">{artifact.title}</span>
                <span className={`text-xs font-semibold ${dueInfo.toneClass}`}>{dueInfo.label}</span>
              </div>
              {artifact.summary && (
                <p className="mt-1 text-xs text-slate-400 line-clamp-2">{artifact.summary}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold ${stateStyleMap[state]}`}>
                  {stateLabelMap[state]}
                </span>
                {data.assignee && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-700/60 bg-slate-800/50 px-2.5 py-1 font-semibold text-slate-300">
                    @{data.assignee}
                  </span>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>

      {counts.total > visibleTasks.length && (
        <p className="text-xs text-slate-500">
          Showing {visibleTasks.length} of {counts.total} open tasks. View the questboard Kanban for the full list.
        </p>
      )}
    </section>
  );
};

export default OpenTasksPanel;


import React, { useMemo } from 'react';
import { Artifact, ArtifactType, TaskData, TASK_STATE, TASK_STATE_VALUES, type TaskState } from '../types';

const normalizeTaskState = (task: Artifact): TaskState => {
  const data = (task.data as TaskData | undefined) ?? { state: TASK_STATE.Todo };
  const rawState = data.state;

  if (rawState && TASK_STATE_VALUES.includes(rawState)) {
    return rawState;
  }

  return TASK_STATE.Todo;
};

interface KanbanCardProps {
  task: Artifact;
  onUpdateTaskState: (taskId: string, newState: TaskState) => void;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ task, onUpdateTaskState }) => {
  const currentState = normalizeTaskState(task);

  const availableStates = useMemo(
    () => TASK_STATE_VALUES.filter((state) => state !== currentState),
    [currentState],
  );

  return (
    <div className="bg-slate-700/70 p-3 rounded-lg border border-slate-600/80 shadow-md">
      <h4 className="font-semibold text-slate-200 mb-1">{task.title}</h4>
      <p className="text-xs text-slate-400 mb-3">{task.summary}</p>
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-slate-500">Move to:</span>
        {availableStates.map(state => (
          <button
            key={state}
            onClick={() => onUpdateTaskState(task.id, state)}
            className="px-2 py-0.5 text-xs font-semibold bg-slate-600 hover:bg-slate-500 text-slate-300 rounded-md transition-colors"
          >
            {state}
          </button>
        ))}
      </div>
    </div>
  );
};

interface KanbanColumnProps {
  title: TaskState;
  tasks: Artifact[];
  onUpdateTaskState: (taskId: string, newState: TaskState) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, tasks, onUpdateTaskState }) => {
  const columnColors = {
    [TASK_STATE.Todo]: 'border-t-blue-400',
    [TASK_STATE.InProgress]: 'border-t-yellow-400',
    [TASK_STATE.Done]: 'border-t-green-400',
  };

  return (
    <div className={`bg-slate-800/50 rounded-lg p-3 border-t-4 ${columnColors[title]}`}>
      <h3 className="font-bold text-slate-300 mb-4 px-1">{title} ({tasks.length})</h3>
      <div className="space-y-3 h-full overflow-y-auto">
        {tasks.length > 0 ? (
          tasks.map(task => <KanbanCard key={task.id} task={task} onUpdateTaskState={onUpdateTaskState} />)
        ) : (
          <div className="text-center text-sm text-slate-500 pt-8">No tasks</div>
        )}
      </div>
    </div>
  );
};

interface KanbanBoardProps {
  artifacts: Artifact[];
  onUpdateArtifactData: (artifactId: string, data: TaskData) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ artifacts, onUpdateArtifactData }) => {
  const tasks = artifacts.filter(a => a.type === ArtifactType.Task);

  const handleUpdateTaskState = (taskId: string, newState: TaskState) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const currentData = (task.data as TaskData | undefined) ?? { state: TASK_STATE.Todo };
      onUpdateArtifactData(taskId, { ...currentData, state: newState });
    }
  };

  const columns = useMemo(
    () =>
      TASK_STATE_VALUES.map((state) => ({
        title: state,
        tasks: tasks.filter((task) => normalizeTaskState(task) === state),
      })),
    [tasks],
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ minHeight: '600px' }}>
      {columns.map(col => (
        <KanbanColumn
          key={col.title}
          title={col.title}
          tasks={col.tasks}
          onUpdateTaskState={handleUpdateTaskState}
        />
      ))}
    </div>
  );
};

export default KanbanBoard;


import React, { useMemo, useState } from 'react';
import { Artifact, ArtifactType, TaskData, TASK_STATE, TASK_STATE_VALUES, type TaskState } from '../types';
import { normalizeTaskState } from '../utils/taskState';

interface KanbanCardProps {
  task: Artifact;
  onUpdateTaskState: (taskId: string, newState: TaskState) => void;
  onDragStart: (taskId: string, event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ task, onUpdateTaskState, onDragStart, onDragEnd, isDragging }) => {
  const currentState = normalizeTaskState((task.data as TaskData | undefined)?.state);

  const availableStates = useMemo(
    () => TASK_STATE_VALUES.filter((state) => state !== currentState),
    [currentState],
  );

  return (
    <div
      className={`bg-slate-700/70 p-3 rounded-lg border border-slate-600/80 shadow-md transition ${
        isDragging ? 'opacity-60 ring-2 ring-emerald-400/40' : ''
      }`}
      draggable
      onDragStart={(event) => onDragStart(task.id, event)}
      onDragEnd={onDragEnd}
    >
      <h4 className="font-semibold text-slate-200 mb-1">{task.title}</h4>
      <p className="text-xs text-slate-400 mb-3">{task.summary}</p>
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-slate-500">Move to:</span>
        {availableStates.map(state => (
          <button
            key={state}
            onClick={() => onUpdateTaskState(task.id, state)}
            className="px-2 py-0.5 text-xs font-semibold bg-slate-600 hover:bg-slate-500 text-slate-300 rounded-md transition-colors"
            aria-label={`Move task to ${state}`}
            title={`Move task to ${state}`}
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
  onDropTask: (taskId: string, newState: TaskState) => void;
  onDragOverColumn: (state: TaskState) => void;
  onDragLeaveColumn: () => void;
  isActiveDropTarget: boolean;
  onDragStart: (taskId: string, event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  draggedTaskId: string | null;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  tasks,
  onUpdateTaskState,
  onDropTask,
  onDragOverColumn,
  onDragLeaveColumn,
  isActiveDropTarget,
  onDragStart,
  onDragEnd,
  draggedTaskId,
}) => {
  const columnColors = {
    [TASK_STATE.Todo]: 'border-t-blue-400',
    [TASK_STATE.InProgress]: 'border-t-yellow-400',
    [TASK_STATE.Done]: 'border-t-green-400',
  };

  return (
    <div
      className={`bg-slate-800/50 rounded-lg p-3 border-t-4 transition ${
        columnColors[title]
      } ${isActiveDropTarget ? 'ring-2 ring-emerald-400/40' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOverColumn(title);
      }}
      onDrop={(event) => {
        event.preventDefault();
        const taskId = event.dataTransfer.getData('text/plain');
        if (taskId) {
          onDropTask(taskId, title);
        }
      }}
      onDragLeave={onDragLeaveColumn}
    >
      <h3 className="font-bold text-slate-300 mb-4 px-1">{title} ({tasks.length})</h3>
      <div className="space-y-3 h-full overflow-y-auto">
        {tasks.length > 0 ? (
          tasks.map(task => (
            <KanbanCard
              key={task.id}
              task={task}
              onUpdateTaskState={onUpdateTaskState}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              isDragging={draggedTaskId === task.id}
            />
          ))
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
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeDropState, setActiveDropState] = useState<TaskState | null>(null);

  const handleUpdateTaskState = (taskId: string, newState: TaskState) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const currentData = (task.data as TaskData | undefined) ?? { state: TASK_STATE.Todo };
      onUpdateArtifactData(taskId, { ...currentData, state: newState });
    }
  };

  const handleDragStart = (taskId: string, event: React.DragEvent<HTMLDivElement>) => {
    setDraggedTaskId(taskId);
    event.dataTransfer.setData('text/plain', taskId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setActiveDropState(null);
  };

  const handleDropTask = (taskId: string, newState: TaskState) => {
    if (!taskId) {
      return;
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      return;
    }

    const currentState = normalizeTaskState((task.data as TaskData | undefined)?.state);
    if (currentState !== newState) {
      handleUpdateTaskState(taskId, newState);
    }

    setActiveDropState(null);
  };

  const columns = useMemo(
    () =>
      TASK_STATE_VALUES.map((state) => ({
        title: state,
        tasks: tasks.filter((task) => normalizeTaskState((task.data as TaskData | undefined)?.state) === state),
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
          onDropTask={handleDropTask}
          onDragOverColumn={(state) => setActiveDropState(state)}
          onDragLeaveColumn={() => setActiveDropState(null)}
          isActiveDropTarget={activeDropState === col.title}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          draggedTaskId={draggedTaskId}
        />
      ))}
    </div>
  );
};

export default KanbanBoard;

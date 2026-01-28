import { TASK_STATE, TASK_STATE_VALUES, type TaskState } from '../types';

const TASK_STATE_ALIASES: Record<string, TaskState> = {
  todo: TASK_STATE.Todo,
  'to do': TASK_STATE.Todo,
  'to-do': TASK_STATE.Todo,
  inprogress: TASK_STATE.InProgress,
  'in progress': TASK_STATE.InProgress,
  done: TASK_STATE.Done,
};

export const normalizeTaskState = (value?: string | null): TaskState => {
  if (!value) {
    return TASK_STATE.Todo;
  }

  if (TASK_STATE_VALUES.includes(value as TaskState)) {
    return value as TaskState;
  }

  const normalized = value.trim().toLowerCase();
  return TASK_STATE_ALIASES[normalized] ?? TASK_STATE.Todo;
};

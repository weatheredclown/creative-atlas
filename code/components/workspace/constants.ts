import { WorkspaceView } from './types';

export const WORKSPACE_VIEW_OPTIONS: Array<{ id: WorkspaceView; label: string; description: string }> = [
  {
    id: 'codex',
    label: 'Codex',
    description: 'Browse artifacts, quick facts, and project stats.',
  },
  {
    id: 'board',
    label: 'Board',
    description: 'Track tasks, milestones, and relationship flows.',
  },
  {
    id: 'laboratory',
    label: 'Laboratory',
    description: 'Experiment with insights, AI copilots, and simulations.',
  },
  {
    id: 'studio',
    label: 'Studio',
    description: 'Prep templates, imports, and release workflows.',
  },
];

export const DEFAULT_WORKSPACE_VIEW: WorkspaceView =
  WORKSPACE_VIEW_OPTIONS[0]?.id ?? 'codex';

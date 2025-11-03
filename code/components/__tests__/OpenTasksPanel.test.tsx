import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, afterEach } from 'vitest';
import OpenTasksPanel from '../OpenTasksPanel';
import { Artifact, ArtifactType, TASK_STATE } from '../../types';

describe('OpenTasksPanel', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const createTask = (overrides: Partial<Artifact> & { id: string }): Artifact => ({
    id: overrides.id,
    ownerId: overrides.ownerId ?? 'user-1',
    projectId: overrides.projectId ?? 'proj-1',
    type: ArtifactType.Task,
    title: overrides.title ?? 'Task',
    summary: overrides.summary ?? 'Summary',
    status: overrides.status ?? 'draft',
    tags: overrides.tags ?? [],
    relations: overrides.relations ?? [],
    data: overrides.data ?? { state: TASK_STATE.Todo },
  });

  it('renders empty state when no open tasks exist', () => {
    const artifacts: Artifact[] = [
      createTask({
        id: 'task-1',
        data: { state: TASK_STATE.Done },
      }),
    ];

    render(
      <OpenTasksPanel
        artifacts={artifacts}
        projectTitle="Tamenzut"
        onSelectTask={() => {}}
      />,
    );

    expect(screen.getByText('All quests complete in Tamenzut. Forge something new!')).toBeInTheDocument();
    expect(screen.getByText('You have no active quest tasks. Create a new task or revisit completed quests.')).toBeInTheDocument();
  });

  it('orders tasks by due date and highlights overdue items', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-05-10T12:00:00Z'));

    const artifacts: Artifact[] = [
      createTask({
        id: 'task-today',
        title: 'Update lexicon',
        data: { state: TASK_STATE.InProgress, due: '2024-05-10' },
      }),
      createTask({
        id: 'task-overdue',
        title: 'Design main character',
        data: { state: TASK_STATE.InProgress, due: '2024-05-08' },
      }),
      createTask({
        id: 'task-future',
        title: 'Outline chapter two',
        data: { state: TASK_STATE.Todo, due: '2024-05-12' },
      }),
    ];

    render(
      <OpenTasksPanel
        artifacts={artifacts}
        projectTitle="Tamenzut"
        onSelectTask={() => {}}
      />,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);

    const [firstItem, secondItem, thirdItem] = buttons;

    expect(within(firstItem).getByText('Design main character')).toBeInTheDocument();
    expect(within(firstItem).getByText('Overdue by 2 days')).toBeInTheDocument();

    expect(within(secondItem).getByText('Update lexicon')).toBeInTheDocument();
    expect(within(secondItem).getByText('Due today')).toBeInTheDocument();

    expect(within(thirdItem).getByText('Outline chapter two')).toBeInTheDocument();
    expect(within(thirdItem).getByText('Due in 2 days')).toBeInTheDocument();
  });

  it('invokes the selection handler when a task is clicked', async () => {
    const artifacts: Artifact[] = [
      createTask({ id: 'task-1', title: 'Outline act one' }),
    ];

    const handleSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <OpenTasksPanel
        artifacts={artifacts}
        projectTitle="Tamenzut"
        onSelectTask={handleSelect}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Outline act one/i }));
    expect(handleSelect).toHaveBeenCalledWith('task-1');
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import React from 'react';
import Quests from '../Quests';
import { Artifact, ArtifactType, Project, ProjectStatus, Quest, TaskData, TASK_STATE } from '../../types';

describe('Quests component', () => {
  const projects: Project[] = [
    { id: 'proj-1', title: 'Tamenzut', summary: 'A world.', status: ProjectStatus.Active, tags: [] },
  ];

  const baseArtifacts: Artifact[] = [
    {
      id: 'art-1',
      projectId: 'proj-1',
      type: ArtifactType.Task,
      title: 'Outline',
      summary: 'Outline the first act.',
      status: 'in-progress',
      tags: [],
      relations: [],
      data: { state: TASK_STATE.InProgress } satisfies TaskData,
    },
  ];

  const quests: Quest[] = [
    {
      id: 'q1',
      title: 'Finish a task',
      description: 'Complete any open task to earn bonus XP.',
      xp: 10,
      isCompleted: (artifacts: Artifact[]) =>
        artifacts.some(
          artifact =>
            artifact.type === ArtifactType.Task && (artifact.data as TaskData).state === TASK_STATE.Done,
        ),
    },
    {
      id: 'q2',
      title: 'Link your world',
      description: 'Create a relation between two artifacts.',
      xp: 5,
      isCompleted: (artifacts: Artifact[]) => artifacts.some(artifact => artifact.relations.length > 0),
    },
  ];

  it('highlights completed quests', () => {
    const completedTask: Artifact = {
      ...baseArtifacts[0],
      id: 'art-2',
      data: { state: TASK_STATE.Done },
    };

    render(<Quests quests={quests} artifacts={[...baseArtifacts, completedTask]} projects={projects} />);

    expect(screen.getByText('+10 XP')).toHaveClass('text-yellow-200');
    expect(screen.getByText('+5 XP')).toHaveClass('text-yellow-400/80');
  });
});

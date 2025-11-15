import { describe, expect, it } from 'vitest';

import { ArtifactType, ProjectStatus } from '../../../types';
import type { Artifact, Project } from '../../../types';
import { achievements } from '../achievements';

describe('achievements data', () => {
  it('unlocks the World Builder achievement after the first project', () => {
    const projects: Project[] = [
      {
        id: 'proj-1',
        ownerId: 'user-1',
        title: 'First Project',
        summary: 'A brand new world',
        status: ProjectStatus.Active,
        tags: [],
      },
    ];
    const artifacts: Artifact[] = [];

    const worldBuilder = achievements.find((achievement) => achievement.id === 'ach-1');
    expect(worldBuilder).toBeDefined();
    expect(worldBuilder?.isUnlocked(artifacts, projects)).toBe(true);
  });

  it('keeps other achievements locked until their requirements are met', () => {
    const projects: Project[] = [
      {
        id: 'proj-1',
        ownerId: 'user-1',
        title: 'First Project',
        summary: 'A brand new world',
        status: ProjectStatus.Active,
        tags: [],
      },
    ];
    const artifacts: Artifact[] = [
      {
        id: 'art-1',
        ownerId: 'user-1',
        projectId: 'proj-1',
        title: 'Map of Somewhere',
        summary: 'A map artifact',
        type: ArtifactType.Location,
        status: 'draft',
        tags: [],
        relations: [],
        data: {},
      },
    ];

    const connector = achievements.find((achievement) => achievement.id === 'ach-4');
    expect(connector).toBeDefined();
    expect(connector?.isUnlocked(artifacts, projects)).toBe(false);
  });
});

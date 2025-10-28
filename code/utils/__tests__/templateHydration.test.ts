import { describe, expect, it } from 'vitest';
import { hydrateTemplate } from '../templateHydration';
import { Artifact, ArtifactType, TaskState, TemplateEntry } from '../../types';

const baseTemplate: TemplateEntry = {
  id: 'kit',
  name: 'Sample Kit',
  description: 'Hydrates starter artifacts.',
  hydrate: {
    xpReward: 12,
    artifacts: [
      {
        key: 'primary',
        type: ArtifactType.Wiki,
        title: '{{project}} Overview',
        summary: 'Summary for {{project}} world building.',
        status: 'draft',
        tags: ['guide'],
        relations: [{ to: 'task', kind: 'RELATES_TO' }],
      },
      {
        key: 'task',
        type: ArtifactType.Task,
        title: 'Plan showcase beat',
        summary: 'Map the next highlight moment.',
        status: 'todo',
        tags: ['planning'],
        data: { state: TaskState.Todo },
      },
    ],
  },
};

describe('hydrateTemplate', () => {
  it('creates artifacts with token replacements and relations', () => {
    const result = hydrateTemplate({
      template: baseTemplate,
      projectId: 'proj-1',
      projectTitle: 'Aurora',
      ownerId: 'user-1',
      existingArtifacts: [],
    });

    expect(result.artifacts).toHaveLength(2);
    const [wiki, task] = result.artifacts;

    expect(wiki.title).toBe('Aurora Overview');
    expect(wiki.summary).toContain('Aurora');
    expect(task.title).toBe('Plan showcase beat');
    expect(task.relations).toEqual([{ toId: wiki.id, kind: 'RELATES_TO' }]);
    expect(result.xpReward).toBe(12);
    expect(result.skippedKeys).toHaveLength(0);
  });

  it('skips artifacts whose titles already exist in the project', () => {
    const existing: Artifact = {
      id: 'existing-1',
      ownerId: 'user-1',
      projectId: 'proj-1',
      type: ArtifactType.Wiki,
      title: 'Aurora Overview',
      summary: 'Existing summary.',
      status: 'draft',
      tags: ['guide'],
      relations: [],
      data: {},
    };

    const result = hydrateTemplate({
      template: baseTemplate,
      projectId: 'proj-1',
      projectTitle: 'Aurora',
      ownerId: 'user-1',
      existingArtifacts: [existing],
    });

    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0].type).toBe(ArtifactType.Task);
    expect(result.artifacts[0].relations).toHaveLength(0);
    expect(result.skippedKeys).toEqual(['primary']);
  });

  it('falls back to default XP reward when none is provided', () => {
    const template: TemplateEntry = {
      id: 'fallback',
      name: 'Fallback',
      description: '',
      hydrate: {
        artifacts: [
          {
            key: 'seed',
            type: ArtifactType.Scene,
            title: 'Scene Seed',
            summary: 'Draft the opening beat.',
          },
        ],
      },
    };

    const result = hydrateTemplate({
      template,
      projectId: 'proj-2',
      projectTitle: 'Nebula',
      ownerId: 'user-2',
      existingArtifacts: [],
    });

    expect(result.artifacts).toHaveLength(1);
    expect(result.xpReward).toBeGreaterThan(0);
  });
});

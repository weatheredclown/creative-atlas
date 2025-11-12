import { describe, expect, it } from 'vitest';

import { summarizeNpcMemory } from '../worldSimulation';
import { ArtifactType, type Artifact, type NpcMemoryRun } from '../../types';

describe('summarizeNpcMemory', () => {
  it('merges NPC memory run metadata into summary entries', () => {
    const artifacts: Artifact[] = [
      {
        id: 'npc-1',
        ownerId: 'owner-1',
        projectId: 'proj-1',
        type: ArtifactType.Character,
        title: 'Captain Sel',
        summary: 'Dustland patrol captain keeping hub routes safe.',
        status: 'draft',
        tags: ['npc'],
        relations: [{ toId: 'location-1', kind: 'PATROLS' }],
        data: {},
      },
      {
        id: 'location-1',
        ownerId: 'owner-1',
        projectId: 'proj-1',
        type: ArtifactType.Location,
        title: 'Rustwatch Outpost',
        summary: 'Hub for Dustland patrol coordination.',
        status: 'draft',
        tags: ['location'],
        relations: [],
        data: { description: 'A fortified platform near the player hub.', features: [] },
      },
    ];

    const npcRuns: NpcMemoryRun[] = [
      {
        id: 'run-1',
        projectId: 'proj-1',
        npcArtifactId: 'npc-1',
        npcName: 'Captain Sel',
        npcType: ArtifactType.Character,
        scope: 'npc',
        pendingSuggestions: 2,
        approvedSuggestions: 1,
        highestCanonicalSensitivity: 'high',
        lastRunAt: '2024-07-12T15:30:00Z',
        lastApprovedAt: '2024-07-12T15:34:00Z',
      },
    ];

    const summary = summarizeNpcMemory(artifacts, artifacts, npcRuns);

    expect(summary.runCount).toBe(1);
    expect(summary.highRiskNpcIds).toEqual(['npc-1']);
    expect(summary.entries).toHaveLength(1);
    expect(summary.entries[0].memoryRun).toMatchObject({
      pendingSuggestions: 2,
      approvedSuggestions: 1,
      highestCanonicalSensitivity: 'high',
      lastRunAt: '2024-07-12T15:30:00Z',
      lastApprovedAt: '2024-07-12T15:34:00Z',
    });
  });
});


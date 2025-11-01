import { describe, expect, it } from 'vitest';
import {
  evaluateMilestoneProgress,
  createProjectActivity,
  ObjectiveStatus,
} from '../milestoneProgress';
import {
  Artifact,
  ArtifactType,
  Milestone,
  Project,
  ProjectStatus,
  TaskData,
  TASK_STATE,
  UserProfile,
} from '../../types';

describe('evaluateMilestoneProgress', () => {
  const project: Project = {
    id: 'proj-1',
    ownerId: 'user-1',
    title: 'Tamenzut',
    summary: 'High fantasy saga.',
    status: ProjectStatus.Active,
    tags: ['fantasy'],
  };

  const profile: UserProfile = {
    uid: 'user-1',
    email: 'user@example.com',
    displayName: 'Astra Creator',
    xp: 120,
    achievementsUnlocked: ['ach-1'],
    settings: {
      theme: 'dark',
      aiTipsEnabled: true,
    },
  };

  const artifacts: Artifact[] = [
    {
      id: 'art-story',
      ownerId: 'user-1',
      projectId: 'proj-1',
      type: ArtifactType.Story,
      title: 'Chapter One',
      summary: 'Opening chapter draft.',
      status: 'released',
      tags: ['story'],
      relations: [{ toId: 'art-task', kind: 'RELATES_TO' }],
      data: [],
    },
    {
      id: 'art-task',
      ownerId: 'user-1',
      projectId: 'proj-1',
      type: ArtifactType.Task,
      title: 'Outline Act II',
      summary: 'Plan the second act beats.',
      status: 'done',
      tags: ['planning'],
      relations: [{ toId: 'art-story', kind: 'SUPPORTS' }],
      data: { state: TASK_STATE.Done } as TaskData,
    },
    {
      id: 'art-conlang',
      ownerId: 'user-1',
      projectId: 'proj-1',
      type: ArtifactType.Conlang,
      title: 'Darv Lexicon',
      summary: 'Foundational vocabulary.',
      status: 'draft',
      tags: ['language'],
      relations: [],
      data: [],
    },
  ];

  const milestones: Milestone[] = [
    {
      id: 'm1',
      title: 'M1',
      timeline: 'Weeks 1–4',
      focus: 'Establish foundations.',
      objectives: [
        { id: 'core-graph', description: 'Core graph', metric: 'graph-core' },
        { id: 'view', description: 'Views', metric: 'view-engagement' },
        { id: 'csv', description: 'CSV flows', metric: 'csv-flows' },
        { id: 'github', description: 'GitHub import', metric: 'github-import' },
      ],
    },
    {
      id: 'm2',
      title: 'M2',
      timeline: 'Weeks 5–8',
      focus: 'Level up editors.',
      objectives: [
        { id: 'editors', description: 'Rich editors', metric: 'rich-editors' },
        { id: 'progression', description: 'Progression loop', metric: 'progression-loops' },
        { id: 'markdown', description: 'Markdown export', metric: 'markdown-export' },
      ],
    },
    {
      id: 'm3',
      title: 'M3',
      timeline: 'Weeks 9–12',
      focus: 'Ship outward.',
      objectives: [
        { id: 'static', description: 'Static site', metric: 'static-site' },
        { id: 'release', description: 'Release notes', metric: 'release-notes' },
        { id: 'search', description: 'Search & filters', metric: 'search-filters' },
      ],
    },
  ];

  it('summarises milestone status from artifacts and activity', () => {
    const activity = createProjectActivity();
    activity.viewedGraph = true;
    activity.viewedKanban = true;
    activity.importedCsv = true;
    activity.exportedData = true;
    activity.generatedReleaseNotes = true;
    activity.usedSearch = true;
    // leave publishedSite false and usedFilters false to exercise in-progress states

    const [m1, m2, m3] = evaluateMilestoneProgress(milestones, {
      project,
      artifacts,
      profile,
      activity,
    });

    const statusFor = (statuses: typeof m1.objectives, id: string): ObjectiveStatus | undefined =>
      statuses.find((objective) => objective.id === id)?.status;

    expect(statusFor(m1.objectives, 'core-graph')).toBe('complete');
    expect(statusFor(m1.objectives, 'view')).toBe('complete');
    expect(statusFor(m1.objectives, 'csv')).toBe('complete');
    expect(statusFor(m1.objectives, 'github')).toBe('not-started');

    expect(statusFor(m2.objectives, 'editors')).toBe('complete');
    expect(statusFor(m2.objectives, 'progression')).toBe('complete');
    expect(statusFor(m2.objectives, 'markdown')).toBe('complete');

    expect(statusFor(m3.objectives, 'static')).toBe('in-progress');
    expect(statusFor(m3.objectives, 'release')).toBe('complete');
    expect(statusFor(m3.objectives, 'search')).toBe('in-progress');

    expect(m1.completion).toBeCloseTo(0.75, 2);
    expect(m2.completion).toBe(1);
    expect(m3.completion).toBeCloseTo(1 / 3, 2);
  });
});

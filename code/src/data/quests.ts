import type { Quest, Questline, TaskData } from '../../types';
import { ArtifactType, ProjectStatus, TASK_STATE } from '../../types';

import {
  countArtifactsByType,
  countArtifactsWithRelations,
  countProjectsByStatus,
  countTaggedArtifacts,
  countTimelineArtifacts,
  countTasksInState,
  getCharacterTraitCount,
  getCompletedTaskCount,
  getConlangLexemeCount,
  getMaxTimelineEventCount,
  getTotalRelations,
  getWikiWordCount,
} from '../../utils/artifactMetrics';

export const getCurrentDateKey = () => new Date().toISOString().slice(0, 10);

const createSeedFromString = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return hash >>> 0;
};

const mulberry32 = (seed: number) => {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const DAILY_QUESTS_PER_DAY = 4;

export const DAILY_QUEST_POOL: Quest[] = [

  {
    id: 'daily-create-artifact',
    title: 'Forge Something New',
    description: 'Create at least one new artifact to expand your atlas.',
    isCompleted: (artifacts) => artifacts.length >= 9,
    xp: 10,
  },
  {
    id: 'daily-task-finish',
    title: 'Ship a Task',
    description: 'Complete a task and mark it as done.',
    isCompleted: (artifacts) => getCompletedTaskCount(artifacts) >= 1,
    xp: 12,
  },
  {
    id: 'daily-task-progress',
    title: 'Kick Off a Task',
    description: 'Move two tasks into progress to build momentum.',
    isCompleted: (artifacts) => countTasksInState(artifacts, TASK_STATE.InProgress) >= 2,
    xp: 9,
  },
  {
    id: 'daily-link-architect',
    title: 'Weave the Web',
    description: 'Link artifacts together until at least three relationships exist.',
    isCompleted: (artifacts) => getTotalRelations(artifacts) >= 3,
    xp: 14,
  },
  {
    id: 'daily-character-cast',
    title: 'Expand the Cast',
    description: 'Profile a second character to deepen your roster.',
    isCompleted: (artifacts) => countArtifactsByType(artifacts, ArtifactType.Character) >= 2,
    xp: 9,
  },
  {
    id: 'daily-location-cartographer',
    title: 'Map New Territory',
    description: 'Document a second location to enrich your world map.',
    isCompleted: (artifacts) => countArtifactsByType(artifacts, ArtifactType.Location) >= 2,
    xp: 9,
  },
  {
    id: 'daily-wiki-scribe',
    title: 'Deepen the Lore',
    description: 'Write at least 150 words across your wiki entries.',
    isCompleted: (artifacts) => getWikiWordCount(artifacts) >= 150,
    xp: 15,
  },
  {
    id: 'daily-timeline-chronicler',
    title: 'Log the Next Beat',
    description: 'Record enough timeline entries so one timeline holds three events.',
    isCompleted: (artifacts) => getMaxTimelineEventCount(artifacts) >= 3,
    xp: 8,
  },
  {
    id: 'daily-conlang-lexicographer',
    title: 'Grow the Lexicon',
    description: 'Record five lexemes across your conlangs.',
    isCompleted: (artifacts) => getConlangLexemeCount(artifacts) >= 5,
    xp: 11,
  },
  {
    id: 'daily-project-pulse',
    title: 'Maintain Momentum',
    description: 'Keep at least three projects active at once.',
    isCompleted: (_, projects) => countProjectsByStatus(projects, ProjectStatus.Active) >= 3,
    xp: 6,
  },
  {
    id: 'daily-scene-director',
    title: 'Storyboard a Scene',
    description: 'Create at least one scene artifact to visualize the story.',
    isCompleted: (artifacts) => countArtifactsByType(artifacts, ArtifactType.Scene) >= 1,
    xp: 8,
  },
  {
    id: 'daily-release-herald',
    title: 'Draft Release Notes',
    description: 'Add a release artifact summarizing your latest drop.',
    isCompleted: (artifacts) => countArtifactsByType(artifacts, ArtifactType.Release) >= 1,
    xp: 12,
  },
  {
    id: 'daily-faction-diplomat',
    title: 'Outline a Faction',
    description: 'Create a faction artifact to capture alliances and rivalries.',
    isCompleted: (artifacts) => countArtifactsByType(artifacts, ArtifactType.Faction) >= 1,
    xp: 11,
  },
  {
    id: 'daily-task-backlog',
    title: 'Balance the Backlog',
    description: 'Maintain at least three tasks to organize your workflow.',
    isCompleted: (artifacts) => countArtifactsByType(artifacts, ArtifactType.Task) >= 3,
    xp: 7,
  },
  {
    id: 'daily-relation-weaver',
    title: 'Connect the Threads',
    description: 'Ensure five artifacts each have at least one relationship.',
    isCompleted: (artifacts) => countArtifactsWithRelations(artifacts, 1) >= 5,
    xp: 16,
  },
  {
    id: 'daily-project-portfolio',
    title: 'Curate the Portfolio',
    description: 'Steward at least five total projects.',
    isCompleted: (_, projects) => projects.length >= 5,
    xp: 5,
  },
  {
    id: 'daily-task-streak',
    title: 'Ship a Trio',
    description: 'Complete three tasks to earn a burst of XP.',
    isCompleted: (artifacts) => getCompletedTaskCount(artifacts) >= 3,
    xp: 18,
  },
  {
    id: 'daily-character-depth',
    title: 'Detail the Cast',
    description: 'Record five character traits across your characters.',
    isCompleted: (artifacts) => getCharacterTraitCount(artifacts) >= 5,
    xp: 10,
  },
  {
    id: 'daily-tag-curator',
    title: 'Tag the Archive',
    description: 'Keep at least four artifacts richly tagged with two or more labels.',
    isCompleted: (artifacts) => countTaggedArtifacts(artifacts, 2) >= 4,
    xp: 9,
  },
  {
    id: 'daily-timeline-historian',
    title: 'Chronicle Two Eras',
    description: 'Maintain at least two timeline artifacts.',
    isCompleted: (artifacts) => countTimelineArtifacts(artifacts) >= 2,
    xp: 13,
  },
];

export const questlines: Questline[] = [

    {
        id: 'momentum-ritual',
        title: 'Momentum Ritual',
        summary: 'Lock in daily habits once you cross into Level 2.',
        unlockLevel: 2,
        objectives: [
            {
                id: 'momentum-streak-3',
                title: 'Keep the flame burning',
                description: 'Earn XP on three consecutive days to prove the habit is real.',
                xpReward: 20,
                isCompleted: (_, __, profile) => profile.bestStreak >= 3,
            },
            {
                id: 'momentum-links-5',
                title: 'Weave five links',
                description: 'Create at least five artifact relationships across your worlds.',
                xpReward: 15,
                isCompleted: (artifacts) => artifacts.reduce((total, artifact) => total + artifact.relations.length, 0) >= 5,
            },
            {
                id: 'momentum-ship-artifact',
                title: 'Ship a finished artifact',
                description: 'Mark any artifact as released or done to celebrate a drop.',
                xpReward: 15,
                isCompleted: (artifacts) =>
                    artifacts.some((artifact) => {
                        const status = artifact.status?.toLowerCase() ?? '';
                        return status === 'released' || status === 'done';
                    }),
            },
        ],
    },
    {
        id: 'launch-cadence',
        title: 'Launch Cadence',
        summary: 'At Level 4, turn streaks into dependable release rituals.',
        unlockLevel: 4,
        objectives: [
            {
                id: 'cadence-streak-7',
                title: 'Seven-day streak',
                description: 'Sustain a seven-day creation streak.',
                xpReward: 30,
                isCompleted: (_, __, profile) => profile.bestStreak >= 7,
            },
            {
                id: 'cadence-tasks-complete',
                title: 'Finish three tasks',
                description: 'Complete three Task artifacts to clear a sprint.',
                xpReward: 25,
                isCompleted: (artifacts) =>
                    artifacts.filter(
                        (artifact) =>
                            artifact.type === ArtifactType.Task &&
                            (artifact.data as TaskData | undefined)?.state === TASK_STATE.Done,
                    ).length >= 3,
            },
            {
                id: 'cadence-link-density',
                title: 'Link ten artifacts',
                description: 'Ensure at least ten artifacts are linked into your graph.',
                xpReward: 25,
                isCompleted: (artifacts) => artifacts.filter((artifact) => artifact.relations.length > 0).length >= 10,
            },
        ],
    },
];

export const selectDailyQuestsForDate = (dateKey: string, count = DAILY_QUESTS_PER_DAY): Quest[] => {
  const seed = createSeedFromString(dateKey);
  const random = mulberry32(seed);
  const pool = [...DAILY_QUEST_POOL];
  const selection: Quest[] = [];
  const questCount = Math.min(count, pool.length);

  for (let index = 0; index < questCount; index += 1) {
    const choiceIndex = Math.floor(random() * pool.length);
    selection.push(pool.splice(choiceIndex, 1)[0]);
  }

  return selection;
};

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import QuestlineBoard from '../QuestlineBoard';
import { ArtifactType, Questline, TaskState, UserProfile } from '../../types';

const baseQuestline: Questline = {
  id: 'questline-test',
  title: 'Test Questline',
  summary: 'Do cool things to earn XP.',
  unlockLevel: 2,
  objectives: [
    {
      id: 'obj-1',
      title: 'Finish a task',
      description: 'Complete any task.',
      xpReward: 10,
      isCompleted: (artifacts) =>
        artifacts.some(
          (artifact) =>
            artifact.type === ArtifactType.Task && (artifact.data as { state: TaskState }).state === TaskState.Done,
        ),
    },
  ],
};

const profile: UserProfile = {
  uid: 'user-1',
  email: 'test@example.com',
  displayName: 'Tester',
  xp: 120,
  streakCount: 4,
  bestStreak: 5,
  lastActiveDate: '2024-05-10',
  achievementsUnlocked: [],
  questlinesClaimed: [],
  settings: { theme: 'system', aiTipsEnabled: true },
};

const completedArtifact = {
  id: 'task-1',
  ownerId: 'user-1',
  projectId: 'proj-1',
  type: ArtifactType.Task,
  title: 'Done Task',
  summary: 'A finished quest',
  status: 'done',
  tags: [],
  relations: [],
  data: { state: TaskState.Done },
};

describe('QuestlineBoard', () => {
  it('shows locked questlines when the level requirement is not met', () => {
    render(
      <QuestlineBoard
        questlines={[baseQuestline]}
        artifacts={[]}
        projects={[]}
        profile={profile}
        level={1}
        claimedQuestlines={[]}
        onClaim={() => {}}
      />,
    );

    expect(screen.getByText(/Reach Level 2 to begin this questline/i)).toBeInTheDocument();
  });

  it('enables claiming XP when all objectives are complete', async () => {
    const user = userEvent.setup();
    const handleClaim = vi.fn();

    render(
      <QuestlineBoard
        questlines={[baseQuestline]}
        artifacts={[completedArtifact]}
        projects={[]}
        profile={profile}
        level={3}
        claimedQuestlines={[]}
        onClaim={handleClaim}
      />,
    );

    const claimButton = screen.getByRole('button', { name: /Claim XP/i });
    expect(claimButton).toBeEnabled();

    await user.click(claimButton);

    expect(handleClaim).toHaveBeenCalledWith('questline-test', 10);
  });

  it('shows claimed status after rewards are collected', () => {
    render(
      <QuestlineBoard
        questlines={[baseQuestline]}
        artifacts={[completedArtifact]}
        projects={[]}
        profile={{ ...profile, questlinesClaimed: ['questline-test'] }}
        level={3}
        claimedQuestlines={['questline-test']}
        onClaim={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: /Claimed/i })).toBeDisabled();
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import UserProfileCard from '../UserProfileCard';
import { UserProfile } from '../../types';
import { MemoryRouter } from 'react-router-dom';

// Mock dependencies
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    updateDisplayName: vi.fn(),
    deleteAccount: vi.fn(),
    signOutUser: vi.fn(),
    isGuestMode: false,
  }),
}));

const mockProfileData: UserProfile = {
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User',
  xp: 100,
  streakCount: 5,
  bestStreak: 10,
  achievementsUnlocked: [],
  questlinesClaimed: [],
  settings: {
    theme: 'dark',
    aiTipsEnabled: true,
  },
  storageUsageBytes: 1024,
  storageLimitBytes: 52428800,
};

vi.mock('../../contexts/UserDataContext', () => ({
  useUserData: () => ({
    profile: {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
      xp: 100,
      streakCount: 5,
      bestStreak: 10,
      achievementsUnlocked: [],
      questlinesClaimed: [],
      settings: {
        theme: 'dark',
        aiTipsEnabled: true,
      },
      storageUsageBytes: 1024,
      storageLimitBytes: 52428800,
    },
    deleteAccountData: vi.fn(),
  }),
}));

// Mock the Icons component since we don't test SVGs directly
vi.mock('../Icons', () => ({
  TriangleToggleIcon: () => <span data-testid="triangle-toggle-icon" />,
  IntelligenceLogo: () => <span data-testid="intelligence-logo" />,
}));

// Mock AccountDeletionPanel since it's a separate component
vi.mock('../AccountDeletionPanel', () => ({
  default: () => <div data-testid="account-deletion-panel" />,
}));

describe('UserProfileCard', () => {
  const defaultProps = {
    profile: mockProfileData,
    onUpdateProfile: vi.fn(),
  };

  it('renders the AI tips toggle with accessible label', () => {
    render(
      <MemoryRouter>
        <UserProfileCard {...defaultProps} />
      </MemoryRouter>
    );

    // First, expand the preferences panel
    const expandButton = screen.getByRole('button', { name: /show preferences/i });
    fireEvent.click(expandButton);

    expect(expandButton).toHaveAttribute('aria-expanded', 'true');

    // Now look for the switch
    // This is the assertion that should fail initially because aria-label is missing
    const switchButton = screen.getByRole('switch', { name: /Atlas Intelligence tips/i });
    expect(switchButton).toBeInTheDocument();
    expect(switchButton).toBeChecked();
  });
});

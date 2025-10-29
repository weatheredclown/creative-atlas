import React from 'react';
import { render, screen } from '@testing-library/react';
import StreakTracker from '../StreakTracker';

describe('StreakTracker', () => {
  it('locks streak progress until the required level is reached', () => {
    render(<StreakTracker currentStreak={0} bestStreak={0} level={1} />);

    expect(screen.getByText(/Locked until Level 2/i)).toBeInTheDocument();
    expect(screen.getByText(/Reach Level 2 to unlock streak tracking/i)).toBeInTheDocument();
  });

  it('shows the current streak and next goal when unlocked', () => {
    render(<StreakTracker currentStreak={2} bestStreak={2} level={3} />);

    expect(screen.getByText(/Current streak/i)).toBeInTheDocument();
    expect(screen.getAllByText(/2 days/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Next goal: 3-day streak/i)).toBeInTheDocument();
  });

  it('celebrates when all goals are surpassed', () => {
    render(<StreakTracker currentStreak={20} bestStreak={20} level={5} />);

    expect(screen.getByText(/surpassed every streak goal/i)).toBeInTheDocument();
  });
});

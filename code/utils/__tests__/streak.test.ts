import { describe, expect, it } from 'vitest';
import { advanceStreak, formatDateKey, StreakSnapshot } from '../streak';

const snapshot = (overrides: Partial<StreakSnapshot> = {}): StreakSnapshot => ({
  streakCount: 0,
  bestStreak: 0,
  ...overrides,
});

describe('advanceStreak', () => {
  it('starts a new streak when there is no previous activity', () => {
    const today = '2024-05-10';
    const result = advanceStreak(snapshot(), today);
    expect(result).toEqual({ streakCount: 1, bestStreak: 1, lastActiveDate: today });
  });

  it('increments the streak on consecutive days', () => {
    const yesterday = '2024-05-09';
    const today = '2024-05-10';
    const result = advanceStreak(snapshot({ streakCount: 2, bestStreak: 3, lastActiveDate: yesterday }), today);
    expect(result).toEqual({ streakCount: 3, bestStreak: 3, lastActiveDate: today });
  });

  it('resets the streak after a gap of more than a day', () => {
    const lastWeek = '2024-05-01';
    const today = '2024-05-10';
    const result = advanceStreak(snapshot({ streakCount: 5, bestStreak: 6, lastActiveDate: lastWeek }), today);
    expect(result).toEqual({ streakCount: 1, bestStreak: 6, lastActiveDate: today });
  });

  it('ignores duplicate updates within the same day', () => {
    const today = '2024-05-10';
    const result = advanceStreak(snapshot({ streakCount: 4, bestStreak: 4, lastActiveDate: today }), today);
    expect(result).toEqual({ streakCount: 4, bestStreak: 4, lastActiveDate: today });
  });

  it('returns the snapshot when today cannot be parsed', () => {
    const result = advanceStreak(snapshot({ streakCount: 2, bestStreak: 2, lastActiveDate: '2024-05-09' }), 'not-a-date');
    expect(result).toEqual({ streakCount: 2, bestStreak: 2, lastActiveDate: '2024-05-09' });
  });
});

describe('formatDateKey', () => {
  it('produces a yyyy-mm-dd key', () => {
    const key = formatDateKey(new Date('2024-05-10T12:34:56Z'));
    expect(key).toBe('2024-05-10');
  });
});

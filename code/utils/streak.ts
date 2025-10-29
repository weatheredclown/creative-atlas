export interface StreakSnapshot {
  streakCount: number;
  bestStreak: number;
  lastActiveDate?: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const parseDateKey = (key?: string): number | null => {
  if (!key) return null;
  const parts = key.split('-').map(Number);
  if (parts.length !== 3 || parts.some((value) => Number.isNaN(value))) {
    return null;
  }
  const [year, month, day] = parts;
  return Date.UTC(year, month - 1, day);
};

export const formatDateKey = (date: Date): string => date.toISOString().slice(0, 10);

export const advanceStreak = (snapshot: StreakSnapshot, todayKey: string): StreakSnapshot => {
  const todayValue = parseDateKey(todayKey);
  if (todayValue === null) {
    return snapshot;
  }

  const normalizedCurrent = Math.max(snapshot.streakCount ?? 0, 0);
  const normalizedBest = Math.max(snapshot.bestStreak ?? 0, 0);

  const lastValue = parseDateKey(snapshot.lastActiveDate);
  if (lastValue === null) {
    const initialStreak = Math.max(normalizedCurrent, 1);
    const best = Math.max(normalizedBest, initialStreak);
    return {
      streakCount: initialStreak,
      bestStreak: best,
      lastActiveDate: todayKey,
    };
  }

  const diff = Math.round((todayValue - lastValue) / MS_PER_DAY);
  if (diff <= 0) {
    return {
      streakCount: normalizedCurrent,
      bestStreak: normalizedBest,
      lastActiveDate: snapshot.lastActiveDate ?? todayKey,
    };
  }

  const nextStreak = diff === 1 ? normalizedCurrent + 1 : 1;
  const nextBest = Math.max(normalizedBest, nextStreak);
  return {
    streakCount: nextStreak,
    bestStreak: nextBest,
    lastActiveDate: todayKey,
  };
};

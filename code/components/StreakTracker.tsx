import React, { useMemo } from 'react';
import { CalendarIcon, CheckCircleIcon, SparklesIcon } from './Icons';

interface StreakGoal {
  days: number;
  label: string;
  xpReward: number;
}

interface StreakTrackerProps {
  currentStreak: number;
  bestStreak: number;
  level: number;
}

const STREAK_UNLOCK_LEVEL = 2;

const STREAK_GOALS: StreakGoal[] = [
  { days: 3, label: 'Spark the habit', xpReward: 10 },
  { days: 7, label: 'Sustain the forge', xpReward: 18 },
  { days: 14, label: 'Legend in the making', xpReward: 30 },
];

const StreakTracker: React.FC<StreakTrackerProps> = ({ currentStreak, bestStreak, level }) => {
  const isUnlocked = level >= STREAK_UNLOCK_LEVEL;

  const nextGoal = useMemo(() => STREAK_GOALS.find((goal) => goal.days > currentStreak), [currentStreak]);
  const completedGoals = useMemo(
    () => STREAK_GOALS.filter((goal) => bestStreak >= goal.days).map((goal) => goal.days),
    [bestStreak],
  );
  const progressToNextGoal = useMemo(() => {
    if (!nextGoal) return 100;
    const previousGoalDays = completedGoals.length ? completedGoals[completedGoals.length - 1] : 0;
    const range = nextGoal.days - previousGoalDays;
    const progressWithinRange = currentStreak - previousGoalDays;
    return Math.min(100, Math.max(0, Math.round((progressWithinRange / range) * 100)));
  }, [completedGoals, currentStreak, nextGoal]);

  return (
    <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg shadow-slate-950/40">
      <header className="flex items-center gap-3">
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/40 p-2">
          <CalendarIcon className="w-5 h-5 text-amber-300" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Streak Forge</h2>
          <p className="text-xs text-slate-400">Keep creating to heat up your daily momentum.</p>
        </div>
      </header>

      {!isUnlocked ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-400">
          <p className="font-semibold text-slate-200">Locked until Level {STREAK_UNLOCK_LEVEL}</p>
          <p>Reach Level {STREAK_UNLOCK_LEVEL} to unlock streak tracking and earn bonus XP for long runs.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
            <div className="rounded-lg bg-slate-800/60 border border-slate-700/60 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Current streak</p>
              <p className="text-lg font-semibold text-amber-300">{currentStreak} day{currentStreak === 1 ? '' : 's'}</p>
            </div>
            <div className="rounded-lg bg-slate-800/60 border border-slate-700/60 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Best streak</p>
              <p className="text-lg font-semibold text-cyan-300">{bestStreak} day{bestStreak === 1 ? '' : 's'}</p>
            </div>
          </div>

          {nextGoal ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Next goal: {nextGoal.days}-day streak</span>
                <span className="text-amber-300 font-semibold">+{nextGoal.xpReward} XP</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-200 transition-all duration-500"
                  style={{ width: `${progressToNextGoal}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/60 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              <SparklesIcon className="w-4 h-4" />
              You&apos;ve surpassed every streak goal. Keep the blaze going!
            </div>
          )}

          <ul className="space-y-2">
            {STREAK_GOALS.map((goal) => {
              const achieved = bestStreak >= goal.days;
              return (
                <li
                  key={goal.days}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                    achieved
                      ? 'border-emerald-500/50 bg-emerald-900/30 text-emerald-200'
                      : 'border-slate-700/60 bg-slate-800/40 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {achieved ? (
                      <CheckCircleIcon className="w-4 h-4" />
                    ) : (
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-500 text-[10px]">
                        {goal.days}
                      </span>
                    )}
                    <span>
                      <span className="font-semibold">{goal.days} days:</span> {goal.label}
                    </span>
                  </div>
                  <span className="font-semibold text-amber-300">+{goal.xpReward} XP</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
};

export default StreakTracker;

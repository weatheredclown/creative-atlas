import React from 'react';
import { Artifact, Project, Questline, UserProfile } from '../types';
import { CheckCircleIcon, FlagIcon, SparklesIcon } from './Icons';

interface QuestlineBoardProps {
  questlines: Questline[];
  artifacts: Artifact[];
  projects: Project[];
  profile: UserProfile;
  level: number;
  claimedQuestlines: string[];
  onClaim: (questlineId: string, xpReward: number) => void;
}

const QuestlineBoard: React.FC<QuestlineBoardProps> = ({
  questlines,
  artifacts,
  projects,
  profile,
  level,
  claimedQuestlines,
  onClaim,
}) => {
  if (questlines.length === 0) {
    return null;
  }

  return (
    <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg shadow-slate-950/40">
      <header className="flex items-center gap-3">
        <div className="rounded-xl bg-purple-500/10 border border-purple-500/40 p-2">
          <FlagIcon className="w-5 h-5 text-purple-300" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Questlines</h2>
          <p className="text-xs text-slate-400">Level up to unlock narrative arcs with big XP payouts.</p>
        </div>
      </header>

      <div className="space-y-4">
        {questlines.map((questline) => {
          const isUnlocked = level >= questline.unlockLevel;
          const completedObjectives = questline.objectives.filter((objective) =>
            objective.isCompleted(artifacts, projects, profile),
          );
          const completionRatio = questline.objectives.length
            ? Math.round((completedObjectives.length / questline.objectives.length) * 100)
            : 0;
          const isComplete = isUnlocked && completedObjectives.length === questline.objectives.length;
          const isClaimed = claimedQuestlines.includes(questline.id);
          const totalXp = questline.objectives.reduce((sum, objective) => sum + objective.xpReward, 0);
          const canClaim = isComplete && !isClaimed;

          return (
            <article
              key={questline.id}
              className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4 space-y-3"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-100">{questline.title}</h3>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-md ${
                      isUnlocked ? 'bg-purple-500/20 text-purple-200' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isUnlocked ? 'Unlocked' : `Level ${questline.unlockLevel}`}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{questline.summary}</p>
              </div>

              {isUnlocked ? (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>
                        {completedObjectives.length} / {questline.objectives.length} objectives complete
                      </span>
                      <span className="font-semibold text-purple-200">{completionRatio}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 via-purple-400 to-purple-300 transition-all duration-500"
                        style={{ width: `${completionRatio}%` }}
                      ></div>
                    </div>
                  </div>

                  <ul className="space-y-2">
                    {questline.objectives.map((objective) => {
                      const completed = completedObjectives.some((item) => item.id === objective.id);
                      return (
                        <li
                          key={objective.id}
                          className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-xs ${
                            completed
                              ? 'border-emerald-500/50 bg-emerald-900/30 text-emerald-200'
                              : 'border-slate-700/60 bg-slate-800/40 text-slate-300'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {completed ? (
                              <CheckCircleIcon className="w-4 h-4 mt-0.5" />
                            ) : (
                              <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-500 text-[10px]">
                                •
                              </span>
                            )}
                            <div>
                              <p className="font-semibold">{objective.title}</p>
                              <p className="text-[11px] text-slate-400">{objective.description}</p>
                            </div>
                          </div>
                          <span className="font-semibold text-amber-300 whitespace-nowrap">+{objective.xpReward} XP</span>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-400">
                      Total reward <span className="font-semibold text-amber-300">+{totalXp} XP</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onClaim(questline.id, totalXp)}
                      disabled={!canClaim}
                      className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                        canClaim
                          ? 'bg-purple-500/80 text-white hover:bg-purple-400'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isClaimed ? (
                        <>
                          <SparklesIcon className="w-4 h-4" />
                          Claimed
                        </>
                      ) : (
                        <>
                          <SparklesIcon className="w-4 h-4" />
                          Claim XP
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-700/70 bg-slate-900/40 p-3 text-xs text-slate-400">
                  Reach Level {questline.unlockLevel} to begin this questline and unlock its objectives.
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default QuestlineBoard;

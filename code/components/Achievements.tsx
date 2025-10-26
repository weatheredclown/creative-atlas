
import React from 'react';
import { Achievement, Artifact, Project } from '../types';
import { TrophyIcon, CheckCircleIcon } from './Icons';

interface AchievementsProps {
  achievements: Achievement[];
  artifacts: Artifact[];
  projects: Project[];
}

const AchievementItem: React.FC<{ achievement: Achievement; isUnlocked: boolean }> = ({ achievement, isUnlocked }) => (
  <div className={`p-3 rounded-lg flex items-center gap-4 transition-all duration-300 ${isUnlocked ? 'bg-amber-900/50 border-amber-700/60' : 'bg-slate-800/60 border-slate-700/50'}`}>
    <div className="flex-shrink-0">
      {isUnlocked ? (
        <CheckCircleIcon className="w-8 h-8 text-amber-400" />
      ) : (
        <TrophyIcon className="w-8 h-8 text-slate-500" />
      )}
    </div>
    <div>
      <h4 className={`font-semibold ${isUnlocked ? 'text-amber-300' : 'text-slate-300'}`}>{achievement.title}</h4>
      <p className={`text-xs ${isUnlocked ? 'text-amber-400/80' : 'text-slate-400'}`}>{achievement.description}</p>
    </div>
  </div>
);

const Achievements: React.FC<AchievementsProps> = ({ achievements, artifacts, projects }) => {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-300 px-2">
        <TrophyIcon className="w-5 h-5 text-amber-400" />
        Achievements
      </h2>
      <div className="space-y-2">
        {achievements.map(ach => (
          <AchievementItem key={ach.id} achievement={ach} isUnlocked={ach.isUnlocked(artifacts, projects)} />
        ))}
      </div>
    </div>
  );
};

export default Achievements;

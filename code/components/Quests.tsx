
import React from 'react';
import { Quest, Artifact, Project } from '../types';
import { CheckCircleIcon, TrophyIcon } from './Icons';

interface QuestsProps {
  quests: Quest[];
  artifacts: Artifact[];
  projects: Project[];
}

const QuestItem: React.FC<{ quest: Quest; isCompleted: boolean }> = ({ quest, isCompleted }) => (
  <div className={`p-4 rounded-lg transition-all duration-300 ${isCompleted ? 'bg-green-900/50 border-green-700/60' : 'bg-slate-800/60 border-slate-700/50'}`}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {isCompleted ? (
          <CheckCircleIcon className="w-6 h-6 text-green-400 flex-shrink-0" />
        ) : (
          <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full border-2 border-slate-500 bg-slate-700"></div>
          </div>
        )}
        <div>
          <h4 className={`font-semibold ${isCompleted ? 'text-green-300' : 'text-slate-200'}`}>{quest.title}</h4>
          <p className={`text-sm ${isCompleted ? 'text-green-400/80' : 'text-slate-400'}`}>{quest.description}</p>
        </div>
      </div>
      <div className={`text-sm font-bold px-2 py-1 rounded-md ${isCompleted ? 'text-yellow-200' : 'text-yellow-400/80'}`}>
        +{quest.xp} XP
      </div>
    </div>
  </div>
);

const Quests: React.FC<QuestsProps> = ({ quests, artifacts, projects }) => {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-300 px-2">
        <TrophyIcon className="w-5 h-5 text-yellow-400" />
        Daily Quests
      </h2>
      <div className="space-y-3">
        {quests.map(quest => (
          <QuestItem key={quest.id} quest={quest} isCompleted={quest.isCompleted(artifacts, projects)} />
        ))}
      </div>
    </div>
  );
};

export default Quests;

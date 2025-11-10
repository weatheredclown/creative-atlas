
import React from 'react';
import { CubeIcon } from './Icons';
import { UserProfile } from '../types';

const getInitials = (name: string) => {
  if (!name) return 'C';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const Header: React.FC<{
  profile: UserProfile;
  xpProgress: number;
  level: number;
  onSignOut: () => void;
  onStartTutorial: () => void;
  adminAction?: React.ReactNode;
}> = ({ profile, xpProgress, level, onSignOut, onStartTutorial, adminAction }) => (
  <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-10 px-4 sm:px-8 py-3 flex justify-between items-center">
    <div className="flex items-center gap-3">
      <CubeIcon className="w-7 h-7 text-cyan-400" />
      <h1 className="text-xl font-bold text-slate-100">Creative Atlas</h1>
    </div>
    <div className="flex items-center gap-4">
      <div className="hidden sm:flex flex-col items-end">
        <span className="text-sm font-semibold text-slate-200">{profile.displayName}</span>
        <span className="text-xs text-slate-400">Level {level}</span>
      </div>
      <div className="relative w-32 h-6 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
        <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500" style={{ width: `${Math.min(xpProgress, 100)}%` }}></div>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white tracking-wider">{xpProgress} / 100 XP</span>
      </div>
      {profile.photoURL ? (
        <img src={profile.photoURL} alt={profile.displayName} className="hidden sm:block w-9 h-9 rounded-full object-cover border border-slate-600" />
      ) : (
        <div className="hidden sm:flex w-9 h-9 rounded-full bg-cyan-600/20 border border-cyan-500/40 items-center justify-center text-sm font-semibold text-cyan-200">
          {getInitials(profile.displayName)}
        </div>
      )}
      {adminAction}
      <button
        onClick={onStartTutorial}
        className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800/70 hover:bg-slate-700 rounded-md border border-slate-600 transition-colors"
      >
        Start Tutorial
      </button>
      <button
        onClick={() => { void onSignOut(); }}
        className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800/70 hover:bg-slate-700 rounded-md border border-slate-600 transition-colors"
      >
        Sign out
      </button>
    </div>
  </header>
);

export default Header;

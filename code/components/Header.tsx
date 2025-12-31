
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
  onOpenProfileDrawer: () => void;
  adminAction?: React.ReactNode;
  isZenMode: boolean;
  onToggleZenMode: () => void;
}> = ({
  profile,
  xpProgress,
  level,
  onSignOut,
  onStartTutorial,
  onOpenProfileDrawer,
  adminAction,
  isZenMode,
  onToggleZenMode,
}) => (
  <header
    className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-10 px-4 sm:px-8 py-3 flex justify-between items-center"
    data-app-header
  >
    <div className="flex items-center gap-3">
      <CubeIcon className="w-7 h-7 text-cyan-400" />
      <h1 className="text-xl font-bold text-slate-100">Creative Atlas</h1>
    </div>
    <div className="flex items-center gap-4">
      <div className="hidden sm:flex flex-col items-end">
        <span className="text-sm font-semibold text-slate-200">{profile.displayName}</span>
        <span className="text-xs text-slate-400">Level {level}</span>
      </div>
      {!isZenMode ? (
        <div className="relative w-32 h-6 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
            style={{ width: `${Math.min(xpProgress, 100)}%` }}
          ></div>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white tracking-wider">
            {xpProgress} / 100 XP
          </span>
        </div>
      ) : null}
      <button
        type="button"
        onClick={onToggleZenMode}
        className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
          isZenMode
            ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20'
            : 'border-slate-600 text-slate-200 bg-slate-800/70 hover:bg-slate-700'
        }`}
        aria-pressed={isZenMode}
      >
        {isZenMode ? 'Exit Zen Mode' : 'Zen Mode'}
      </button>
      <button
        type="button"
        onClick={onOpenProfileDrawer}
        className="inline-flex rounded-full border border-transparent p-0.5 transition-colors hover:border-cyan-400/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        aria-label="Open profile drawer"
        title="Open profile drawer"
      >
        {profile.photoURL ? (
          <img src={profile.photoURL} alt={profile.displayName} className="w-9 h-9 rounded-full object-cover border border-slate-600" />
        ) : (
          <div className="flex w-9 h-9 rounded-full bg-cyan-600/20 border border-cyan-500/40 items-center justify-center text-sm font-semibold text-cyan-200">
            {getInitials(profile.displayName)}
          </div>
        )}
      </button>
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

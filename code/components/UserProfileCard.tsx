import React, { useEffect, useMemo, useState } from 'react';
import { ThemePreference, UserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { TriangleToggleIcon } from './Icons';

interface UserProfileCardProps {
  profile: UserProfile;
  onUpdateProfile: (updates: { displayName?: string; settings?: Partial<UserProfile['settings']> }) => void;
}

const themeOptions: { label: string; value: ThemePreference }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

const initialsFromName = (name: string) => {
  if (!name) return 'C';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const levelFromXp = (xp: number) => Math.floor(xp / 100) + 1;
const progressFromXp = (xp: number) => xp % 100;

const UserProfileCard: React.FC<UserProfileCardProps> = ({ profile, onUpdateProfile }) => {
  const { updateDisplayName } = useAuth();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setDisplayName(profile.displayName);
  }, [profile.displayName]);

  const level = useMemo(() => levelFromXp(profile.xp), [profile.xp]);
  const xpProgress = useMemo(() => progressFromXp(profile.xp), [profile.xp]);
  const xpPercent = useMemo(() => Math.min(xpProgress, 100), [xpProgress]);
  const xpToNextLevel = useMemo(() => Math.max(100 - xpProgress, 0), [xpProgress]);
  const xpRingStyle = useMemo(
    () => ({
      background: `conic-gradient(rgb(103 232 249) ${xpPercent * 3.6}deg, rgba(15, 23, 42, 0.8) ${xpPercent * 3.6}deg 360deg)`
    }),
    [xpPercent]
  );

  useEffect(() => {
    setIsExpanded(false);
  }, [profile.uid]);

  const handleNameSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = displayName.trim();
    if (!trimmed) {
      setStatusMessage('Display name cannot be empty.');
      return;
    }

    setSaving(true);
    setStatusMessage(null);
    try {
      await updateDisplayName(trimmed);
      onUpdateProfile({ displayName: trimmed });
      setStatusMessage('Profile updated successfully.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to update profile name.');
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateProfile({ settings: { theme: event.target.value as ThemePreference } });
  };

  const handleAiTipsToggle = () => {
    onUpdateProfile({ settings: { aiTipsEnabled: !profile.settings.aiTipsEnabled } });
  };

  const preferencesPanelId = `preferences-panel-${profile.uid}`;

  return (
    <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg shadow-slate-950/40">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-2">
            {profile.photoURL ? (
              <img
                src={profile.photoURL}
                alt={profile.displayName}
                className="w-12 h-12 rounded-full object-cover border border-slate-700"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-lg font-semibold text-cyan-200">
                {initialsFromName(profile.displayName)}
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsExpanded((previous) => !previous)}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-cyan-500/60 bg-slate-800/70 text-cyan-200 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              aria-label={isExpanded ? 'Hide preferences' : 'Show preferences'}
              aria-expanded={isExpanded}
              aria-controls={preferencesPanelId}
            >
              <TriangleToggleIcon
                className={`h-3.5 w-3.5 transition-transform duration-300 ease-in-out ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
              />
            </button>
          </div>
          <div>
            <p className="text-sm font-medium text-cyan-300">Creator Level {level}</p>
            <h2 className="text-lg font-semibold text-white">{profile.displayName}</h2>
            <p className="text-xs text-slate-400">{profile.email}</p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 text-xs text-slate-300">
          <div className="relative">
            <div
              className="w-16 h-16 rounded-full border border-slate-800 shadow-inner shadow-slate-900/60"
              style={xpRingStyle}
              aria-hidden="true"
            ></div>
            <div className="absolute inset-1 rounded-full bg-slate-950/80 border border-slate-800 flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase tracking-wide text-slate-500">Level</span>
              <span className="text-lg font-semibold text-cyan-200">{level}</span>
            </div>
          </div>
        </div>
      </header>

      <div
        id={preferencesPanelId}
        className={`mt-5 overflow-hidden transition-[max-height] duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px]' : 'max-h-0'}`}
        aria-hidden={!isExpanded}
      >
        <div className={`space-y-5 transition-opacity duration-300 ease-in-out ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
          <form onSubmit={handleNameSubmit} className="space-y-3">
            <div>
              <label htmlFor="display-name" className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                Display name
              </label>
              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
            <button
              type="submit"
              className="w-full px-3 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save profile'}
            </button>
            {statusMessage && (
              <p className="text-xs text-cyan-300" role="status">{statusMessage}</p>
            )}
          </form>

          <div className="space-y-3">
            <div>
              <label htmlFor="theme" className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                Theme preference
              </label>
              <select
                id="theme"
                value={profile.settings.theme}
                onChange={handleThemeChange}
                className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              >
                {themeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-200">AI copilots tips</p>
                <p className="text-xs text-slate-400">{profile.settings.aiTipsEnabled ? 'Enabled' : 'Disabled'} for contextual suggestions.</p>
              </div>
              <button
                type="button"
                onClick={handleAiTipsToggle}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out ${profile.settings.aiTipsEnabled ? 'bg-cyan-500' : 'bg-slate-700'}`}
                role="switch"
                aria-checked={profile.settings.aiTipsEnabled}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${profile.settings.aiTipsEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                ></span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              Achievements synced:{' '}
              <span className="text-slate-200 font-semibold">{profile.achievementsUnlocked.length}</span>
            </span>
            <span>
              Total XP:{' '}
              <span className="text-slate-200 font-semibold">{profile.xp}</span>
            </span>
            <span>
              XP to next level:{' '}
              <span className="text-slate-200 font-semibold">{xpToNextLevel}</span>
            </span>
            <span>
              Current streak:{' '}
              <span className="text-slate-200 font-semibold">{profile.streakCount} day{profile.streakCount === 1 ? '' : 's'}</span>
            </span>
            <span>
              Best streak:{' '}
              <span className="text-slate-200 font-semibold">{profile.bestStreak} day{profile.bestStreak === 1 ? '' : 's'}</span>
            </span>
            <span>
              Questlines claimed:{' '}
              <span className="text-slate-200 font-semibold">{profile.questlinesClaimed.length}</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UserProfileCard;


import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import {
  Achievement,
  Artifact,
  Project,
  Quest,
  Questline,
  UserProfile,
} from '../types';
import { XMarkIcon } from './Icons';
import UserProfileCard from './UserProfileCard';
import StreakTracker from './StreakTracker';
import Quests from './Quests';
import QuestlineBoard from './QuestlineBoard';
import Achievements from './Achievements';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  level: number;
  quests: Quest[];
  questlines: Questline[];
  claimedQuestlines: string[];
  onClaimQuestline: (questlineId: string, xpReward: number) => void;
  achievements: Achievement[];
  projects: Project[];
  artifacts: Artifact[];
  isViewingOwnWorkspace: boolean;
  onUpdateProfile: (updates: { displayName?: string; settings?: Partial<UserProfile['settings']> }) => void;
}

const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  isOpen,
  onClose,
  profile,
  level,
  quests,
  questlines,
  claimedQuestlines,
  onClaimQuestline,
  achievements,
  projects,
  artifacts,
  isViewingOwnWorkspace,
  onUpdateProfile,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside
        className="ml-auto flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto border-l border-slate-800/80 bg-slate-950/95 p-6 text-slate-100 shadow-2xl shadow-slate-950/50"
        role="dialog"
        aria-modal="true"
        aria-label="Profile drawer"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Profile</p>
            <h2 className="text-2xl font-semibold text-white">{profile.displayName}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-600/60 p-2 text-slate-200 transition-colors hover:border-slate-400/80 hover:text-white"
            aria-label="Close profile drawer"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          {isViewingOwnWorkspace && (
            <UserProfileCard profile={profile} onUpdateProfile={onUpdateProfile} />
          )}
          <StreakTracker currentStreak={profile.streakCount} bestStreak={profile.bestStreak} level={level} />
          <Quests quests={quests} artifacts={artifacts} projects={projects} />
          <QuestlineBoard
            questlines={questlines}
            artifacts={artifacts}
            projects={projects}
            profile={profile}
            level={level}
            claimedQuestlines={claimedQuestlines}
            onClaim={onClaimQuestline}
          />
          <Achievements achievements={achievements} artifacts={artifacts} projects={projects} />
        </div>
      </aside>
    </div>,
    document.body,
  );
};

export default ProfileDrawer;

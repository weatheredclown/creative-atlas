import { TutorialLanguage } from '../types';
import { DEFAULT_TUTORIAL_LANGUAGE, getTutorialSteps, tutorialLanguageOptions } from './tutorial';

export interface TutorialProgressState {
  currentStep: number;
  hasCompleted: boolean;
  wasDismissed: boolean;
  language: TutorialLanguage;
  dismissedBanners: string[];
}

const STORAGE_KEY = 'creative-atlas:tutorial-progress';

const DEFAULT_PROGRESS: TutorialProgressState = {
  currentStep: 0,
  hasCompleted: false,
  wasDismissed: false,
  language: DEFAULT_TUTORIAL_LANGUAGE,
  dismissedBanners: [],
};

const AVAILABLE_TUTORIAL_LANGUAGES = new Set<TutorialLanguage>(
  tutorialLanguageOptions.map(option => option.code),
);

const parseLanguage = (value: unknown): TutorialLanguage => {
  if (typeof value === 'string' && AVAILABLE_TUTORIAL_LANGUAGES.has(value as TutorialLanguage)) {
    return value as TutorialLanguage;
  }

  return DEFAULT_TUTORIAL_LANGUAGE;
};

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const loadTutorialProgress = (): TutorialProgressState => {
  if (!isBrowser) {
    return { ...DEFAULT_PROGRESS };
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { ...DEFAULT_PROGRESS };
    }

    const parsed = JSON.parse(stored) as Partial<TutorialProgressState> | null;
    if (!parsed) {
      return { ...DEFAULT_PROGRESS };
    }

    const language = parseLanguage(parsed.language);
    const steps = getTutorialSteps(language);
    const currentStep = Number.isFinite(parsed.currentStep)
      ? Math.min(Math.max(parsed.currentStep ?? 0, 0), steps.length - 1)
      : DEFAULT_PROGRESS.currentStep;
    const dismissedBanners = Array.isArray(parsed.dismissedBanners)
      ? parsed.dismissedBanners.filter((value): value is string => typeof value === 'string')
      : DEFAULT_PROGRESS.dismissedBanners;

    return {
      currentStep,
      hasCompleted: Boolean(parsed.hasCompleted),
      wasDismissed: Boolean(parsed.wasDismissed),
      language,
      dismissedBanners,
    };
  } catch (error) {
    console.warn('Failed to load tutorial progress from storage.', error);
    return { ...DEFAULT_PROGRESS };
  }
};

export const persistTutorialProgress = (progress: TutorialProgressState): void => {
  if (!isBrowser) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.warn('Failed to persist tutorial progress.', error);
  }
};

export const resetTutorialProgress = (): TutorialProgressState => {
  if (isBrowser) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to reset tutorial progress.', error);
    }
  }

  return { ...DEFAULT_PROGRESS };
};

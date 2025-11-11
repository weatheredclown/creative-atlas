import { TutorialLanguage } from '../types';
import { DEFAULT_TUTORIAL_LANGUAGE, getTutorialSteps, tutorialLanguageOptions } from './tutorial';

export interface TutorialProgressState {
  currentStep: number;
  hasCompleted: boolean;
  wasDismissed: boolean;
  language: TutorialLanguage;
}

const STORAGE_KEY = 'creative-atlas:tutorial-progress';

const createDefaultProgress = (language: TutorialLanguage = DEFAULT_TUTORIAL_LANGUAGE): TutorialProgressState => ({
  currentStep: 0,
  hasCompleted: false,
  wasDismissed: false,
  language,
});

const DEFAULT_PROGRESS = createDefaultProgress();

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

const getLanguageFromQuery = (): TutorialLanguage | null => {
  if (!isBrowser) {
    return null;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const candidate = params.get('hl');
    if (candidate && AVAILABLE_TUTORIAL_LANGUAGES.has(candidate as TutorialLanguage)) {
      return candidate as TutorialLanguage;
    }
  } catch (error) {
    console.warn('Failed to read tutorial language from URL.', error);
  }

  return null;
};

export const loadTutorialProgress = (): TutorialProgressState => {
  const languageOverride = getLanguageFromQuery();

  if (!isBrowser) {
    return createDefaultProgress(languageOverride ?? DEFAULT_PROGRESS.language);
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return createDefaultProgress(languageOverride ?? DEFAULT_PROGRESS.language);
    }

    const parsed = JSON.parse(stored) as Partial<TutorialProgressState> | null;
    if (!parsed) {
      return createDefaultProgress(languageOverride ?? DEFAULT_PROGRESS.language);
    }

    const language = languageOverride ?? parseLanguage(parsed.language);
    const steps = getTutorialSteps(language);
    const currentStep = Number.isFinite(parsed.currentStep)
      ? Math.min(Math.max(parsed.currentStep ?? 0, 0), steps.length - 1)
      : DEFAULT_PROGRESS.currentStep;

    return {
      currentStep,
      hasCompleted: Boolean(parsed.hasCompleted),
      wasDismissed: Boolean(parsed.wasDismissed),
      language,
    };
  } catch (error) {
    console.warn('Failed to load tutorial progress from storage.', error);
    return createDefaultProgress(languageOverride ?? DEFAULT_PROGRESS.language);
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

import { tutorialSteps } from './tutorial';

export interface TutorialProgressState {
  currentStep: number;
  hasCompleted: boolean;
  wasDismissed: boolean;
}

const STORAGE_KEY = 'creative-atlas:tutorial-progress';

const DEFAULT_PROGRESS: TutorialProgressState = {
  currentStep: 0,
  hasCompleted: false,
  wasDismissed: false,
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

    const currentStep = Number.isFinite(parsed.currentStep)
      ? Math.min(Math.max(parsed.currentStep ?? 0, 0), tutorialSteps.length - 1)
      : DEFAULT_PROGRESS.currentStep;

    return {
      currentStep,
      hasCompleted: Boolean(parsed.hasCompleted),
      wasDismissed: Boolean(parsed.wasDismissed),
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

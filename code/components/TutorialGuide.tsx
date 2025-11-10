
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TutorialLanguage, TutorialStep } from '../types';
import { DEFAULT_TUTORIAL_LANGUAGE, getTutorialSteps, tutorialLanguageOptions } from '../utils/tutorial';
import TutorialPopover from './TutorialPopover';
import Stepper from './Stepper';

interface TutorialGuideProps {
  onClose: () => void;
  initialStep?: number;
  onStepChange?: (step: number) => void;
  onComplete?: () => void;
  language?: TutorialLanguage;
  onLanguageChange?: (language: TutorialLanguage) => void;
}

const setNativeValue = (element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) => {
  const { set } = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value') ?? {};
  set?.call(element, value);
  const eventName = element instanceof HTMLSelectElement ? 'change' : 'input';
  const event = new Event(eventName, { bubbles: true });
  element.dispatchEvent(event);
};

const TutorialGuide: React.FC<TutorialGuideProps> = ({
  onClose,
  initialStep = 0,
  onStepChange,
  onComplete,
  language = DEFAULT_TUTORIAL_LANGUAGE,
  onLanguageChange,
}) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const steps = useMemo(() => getTutorialSteps(language), [language]);

  useEffect(() => {
    setCurrentStep(initialStep);
  }, [initialStep]);

  useEffect(() => {
    setCurrentStep(previous => {
      if (steps.length === 0) {
        return 0;
      }
      return Math.min(previous, steps.length - 1);
    });
  }, [steps]);

  const handleNextStep = useCallback(() => {
    setCurrentStep((previousStep) => {
      if (previousStep < steps.length - 1) {
        return previousStep + 1;
      }

      if (onComplete) {
        onComplete();
      } else {
        onClose();
      }
      return previousStep;
    });
  }, [onClose, onComplete, steps.length]);

  const handleCancelTutorial = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleCancelTutorial);

    return () => {
      document.removeEventListener('keydown', handleCancelTutorial);
    };
  }, [handleCancelTutorial]);

  useEffect(() => {
    const step = steps[currentStep];
    if (step?.target) {
      const element = document.querySelector(step.target);
      setReferenceElement(element instanceof HTMLElement ? element : null);
      const eventType = step.advanceEvent ?? 'click';

      if (step.prefill) {
        Object.entries(step.prefill).forEach(([selector, value]) => {
          const input = document.querySelector(selector);
          if (
            input instanceof HTMLInputElement ||
            input instanceof HTMLTextAreaElement ||
            input instanceof HTMLSelectElement
          ) {
            setNativeValue(input, value);
          }
        });
      }

      if (element) {
        element.addEventListener(eventType, handleNextStep);
      }
    }

    return () => {
      const step = steps[currentStep];
      if (step?.target) {
        const element = document.querySelector(step.target);
        const eventType = step.advanceEvent ?? 'click';
        element?.removeEventListener(eventType, handleNextStep);
      }
    };
  }, [currentStep, handleNextStep, steps]);

  useEffect(() => {
    onStepChange?.(currentStep);
  }, [currentStep, onStepChange]);

  useEffect(() => {
    if (!referenceElement && contentRef.current) {
      contentRef.current.focus();
      return;
    }

    const timeout = window.setTimeout(() => {
      contentRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [currentStep, referenceElement]);

  const handlePreviousStep = () => {
    setCurrentStep(previous => (previous > 0 ? previous - 1 : previous));
  };

  const totalSteps = steps.length;
  const currentTutorialStep: TutorialStep = steps[currentStep];
  const isLastStep = currentStep === totalSteps - 1;
  const canGoBack = currentStep > 0;

  const handleLanguageSelect = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      onLanguageChange?.(event.target.value as TutorialLanguage);
    },
    [onLanguageChange],
  );

  if (!currentTutorialStep) {
    return null;
  }

  return (
    <>
      <Stepper steps={steps.map(step => step.title)} currentStep={currentStep} />
      <TutorialPopover referenceElement={referenceElement}>
        <div
          ref={contentRef}
          tabIndex={-1}
          className="relative space-y-4 text-slate-100 focus:outline-none"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-0 top-0 -mr-2 -mt-2 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-800/70 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            aria-label="Close tutorial"
          >
            <span aria-hidden="true">&times;</span>
          </button>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300" aria-live="polite" role="status">
                Step {currentStep + 1} of {totalSteps}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-slate-50">{currentTutorialStep.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{currentTutorialStep.explanation}</p>
            </div>
            <div className="flex w-full flex-col gap-1 sm:w-44">
              <label htmlFor="tutorial-language" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Language
              </label>
              <select
                id="tutorial-language"
                value={language}
                onChange={handleLanguageSelect}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 transition-colors focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {tutorialLanguageOptions.map(option => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-cyan-300">Action</span>
            <p className="text-sm text-slate-200">{currentTutorialStep.action}</p>
          </div>
          {(currentTutorialStep.showNextButton || canGoBack) && (
            <div className="flex justify-between gap-3 pt-1">
              <button
                onClick={handlePreviousStep}
                className="rounded-md border border-slate-600 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canGoBack}
                type="button"
              >
                Back
              </button>
              {currentTutorialStep.showNextButton && (
                <button
                  onClick={handleNextStep}
                  className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-cyan-600/30 transition-colors hover:bg-cyan-500"
                  type="button"
                >
                  {isLastStep ? 'Finish Tutorial' : 'Mark Step Complete'}
                </button>
              )}
            </div>
          )}
        </div>
      </TutorialPopover>
    </>
  );
};

export default TutorialGuide;

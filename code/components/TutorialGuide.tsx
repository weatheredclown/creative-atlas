
import React, { useState, useEffect, useCallback } from 'react';
import { TutorialStep } from '../types';
import { tutorialSteps } from '../utils/tutorial';
import TutorialPopover from './TutorialPopover';
import Stepper from './Stepper';

interface TutorialGuideProps {
  onClose: () => void;
}

const TutorialGuide: React.FC<TutorialGuideProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null);

  const handleNextStep = useCallback(() => {
    setCurrentStep((previousStep) => {
      if (previousStep < tutorialSteps.length - 1) {
        return previousStep + 1;
      }

      onClose();
      return previousStep;
    });
  }, [onClose]);

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
    const step = tutorialSteps[currentStep];
    if (step.target) {
      const element = document.querySelector(step.target);
      setReferenceElement(element instanceof HTMLElement ? element : null);
      const eventType = step.advanceEvent ?? 'click';

      if (step.prefill) {
        Object.entries(step.prefill).forEach(([selector, value]) => {
          const input = document.querySelector(selector) as HTMLInputElement;
          if (input) {
            input.value = value;
          }
        });
      }

      if (element) {
        element.addEventListener(eventType, handleNextStep);
      }
    }

    return () => {
      const step = tutorialSteps[currentStep];
      if (step.target) {
        const element = document.querySelector(step.target);
        if (element) {
          const eventType = step.advanceEvent ?? 'click';
          element.removeEventListener(eventType, handleNextStep);
        }
      }
    };
  }, [currentStep, handleNextStep]);

  const handlePreviousStep = () => {
    setCurrentStep(previous => (previous > 0 ? previous - 1 : previous));
  };

  const currentTutorialStep: TutorialStep = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;
  const canGoBack = currentStep > 0;

  return (
    <>
      <Stepper steps={tutorialSteps.map(step => step.title)} currentStep={currentStep} />
      <TutorialPopover referenceElement={referenceElement}>
        <div className="relative space-y-4 text-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-0 top-0 -mr-2 -mt-2 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-800/70 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            aria-label="Close tutorial"
          >
            <span aria-hidden="true">&times;</span>
          </button>
          <div>
            <h3 className="text-lg font-semibold text-slate-50">{currentTutorialStep.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{currentTutorialStep.explanation}</p>
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

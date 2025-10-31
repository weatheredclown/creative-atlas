
import React, { useState, useEffect } from 'react';
import { tutorialSteps } from '../utils/tutorial';
import TutorialPopover from './TutorialPopover';

const TutorialGuide: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const step = tutorialSteps[currentStep];
    if (step.target) {
      const element = document.querySelector(step.target) as HTMLElement;
      setReferenceElement(element);

      if (step.prefill) {
        Object.entries(step.prefill).forEach(([selector, value]) => {
          const input = document.querySelector(selector) as HTMLInputElement;
          if (input) {
            input.value = value;
          }
        });
      }

      if (element) {
        element.addEventListener('click', handleNextStep);
      }
    }

    return () => {
      const step = tutorialSteps[currentStep];
      if (step.target) {
        const element = document.querySelector(step.target) as HTMLElement;
        if (element) {
          element.removeEventListener('click', handleNextStep);
        }
      }
    };
  }, [currentStep]);

  const handleNextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const currentTutorialStep = tutorialSteps[currentStep];

  return (
    <TutorialPopover referenceElement={referenceElement}>
      <div>
        <h3 className="text-lg font-bold">{currentTutorialStep.title}</h3>
        <p className="mt-2">{currentTutorialStep.explanation}</p>
      </div>
    </TutorialPopover>
  );
};

export default TutorialGuide;

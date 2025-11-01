
import React, { useState, useEffect } from 'react';
import Stepper from './Stepper';
import Modal from './Modal';
import { tutorialSteps } from '../utils/tutorial';
import { TutorialContent } from './tutorial/TutorialContent';

interface TutorialProps {
  onClose: () => void;
}

const Tutorial: React.FC<TutorialProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(true);

  const handleNextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsModalOpen(false);
      onClose();
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    onClose();
  };

  useEffect(() => {
    setIsModalOpen(true);
  }, []);

  const currentTutorialStep = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;

  return (
    <div>
      <Stepper steps={tutorialSteps.map(step => step.title)} currentStep={currentStep} />
      <Modal isOpen={isModalOpen} onClose={handleClose} title={currentTutorialStep.title}>
        <div className="p-4 space-y-4">
          <p className="text-sm leading-relaxed text-slate-300">{currentTutorialStep.explanation}</p>
          <TutorialContent step={currentStep} />
          <div className="flex flex-col gap-3 rounded-md border border-slate-700/80 bg-slate-900/60 p-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-cyan-300">Action</span>
            <p className="text-sm text-slate-200">{currentTutorialStep.action}</p>
          </div>
          <div className="pt-1 flex justify-between gap-3">
            <button
              onClick={handlePreviousStep}
              className="px-4 py-2 text-sm font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-700 rounded-md border border-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentStep === 0}
              type="button"
            >
              Back
            </button>
            <button
              onClick={handleNextStep}
              className="px-4 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md shadow-md shadow-cyan-600/30 transition-colors"
              type="button"
            >
              {isLastStep ? 'Finish Tutorial' : 'Mark Step Complete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Tutorial;

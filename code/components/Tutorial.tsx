
import React, { useState, useEffect } from 'react';
import Stepper from './Stepper';
import Modal from './Modal';
import { tutorialSteps } from '../utils/tutorial';

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

  const handleClose = () => {
    setIsModalOpen(false);
    onClose();
  };

  useEffect(() => {
    setIsModalOpen(true);
  }, []);

  const currentTutorialStep = tutorialSteps[currentStep];

  return (
    <div>
      <Stepper steps={tutorialSteps.map(step => step.title)} currentStep={currentStep} />
      <Modal isOpen={isModalOpen} onClose={handleClose} title={currentTutorialStep.title}>
        <div className="p-4">
          <p className="text-slate-300">{currentTutorialStep.explanation}</p>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleNextStep}
              className="px-4 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors"
            >
              {currentStep < tutorialSteps.length - 1 ? 'Next' : 'Finish'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Tutorial;


import React from 'react';

interface StepperProps {
  steps: string[];
  currentStep: number;
}

const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-slate-900 p-4 border-t border-slate-700 flex justify-around">
      {steps.map((step, index) => (
        <div key={index} className={`flex flex-col items-center ${index === currentStep ? 'text-cyan-400' : 'text-slate-500'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 ${index === currentStep ? 'bg-cyan-400 text-white border-cyan-400' : 'bg-slate-800 border-slate-700'}`}>
            {index + 1}
          </div>
          <div className="mt-2 text-xs text-center">{step}</div>
        </div>
      ))}
    </div>
  );
};

export default Stepper;


import React from 'react';
import { CheckCircleIcon } from './Icons';

interface StepperProps {
  steps: string[];
  currentStep: number;
}

const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-slate-950/95 border-t border-slate-800/80 backdrop-blur-sm px-4 py-3">
      <nav aria-label="Tutorial progress" className="max-w-5xl mx-auto">
        <ol className="flex items-center gap-3 text-xs">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isActive = index === currentStep;
            const isLast = index === steps.length - 1;
            const circleBase = 'flex items-center justify-center rounded-full border-2 transition-colors duration-200';

            return (
              <li key={step} className={`flex items-center gap-3 ${isLast ? '' : 'flex-1'}`} aria-current={isActive ? 'step' : undefined}>
                <div className="flex items-center gap-3">
                  <div
                    className={[
                      circleBase,
                      'w-9 h-9',
                      isActive
                        ? 'bg-cyan-500 border-cyan-400 text-white shadow-lg shadow-cyan-500/30'
                        : isCompleted
                          ? 'bg-cyan-500/20 border-cyan-400/80 text-cyan-100'
                          : 'bg-slate-900 border-slate-700 text-slate-400',
                    ].join(' ')}
                  >
                    {isCompleted ? (
                      <CheckCircleIcon className="w-5 h-5" />
                    ) : (
                      <span className="font-semibold">{index + 1}</span>
                    )}
                  </div>
                  <span
                    className={`hidden sm:block font-medium transition-colors duration-200 ${
                      isActive
                        ? 'text-slate-100'
                        : isCompleted
                          ? 'text-slate-300'
                          : 'text-slate-500'
                    }`}
                  >
                    {step}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={`hidden sm:block h-0.5 flex-1 rounded-full ${
                      isCompleted
                        ? 'bg-cyan-400/70'
                        : isActive
                          ? 'bg-cyan-400/40'
                          : 'bg-slate-700'
                    }`}
                    role="presentation"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
};

export default Stepper;

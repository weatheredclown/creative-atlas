
import React from 'react';
import { CheckCircleIcon } from './Icons';

interface StepperProps {
  steps: string[];
  currentStep: number;
}

const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
  return (
    <div className="fixed bottom-0 left-0 w-full border-t border-slate-800/80 bg-slate-950/95 px-4 py-3 backdrop-blur-sm">
      <nav aria-label="Tutorial progress" className="mx-auto max-w-5xl">
        <ol className="flex items-center gap-3 text-xs">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isActive = index === currentStep;
            const isLast = index === steps.length - 1;

            return (
              <li
                key={step}
                className={`flex items-center gap-3 ${isLast ? '' : 'flex-1'}`}
                aria-current={isActive ? 'step' : undefined}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={[
                      'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors duration-200',
                      isActive
                        ? 'border-cyan-400 bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                        : isCompleted
                          ? 'border-cyan-400/80 bg-cyan-500/20 text-cyan-100'
                          : 'border-slate-700 bg-slate-900 text-slate-400',
                    ].join(' ')}
                  >
                    {isCompleted ? <CheckCircleIcon className="h-5 w-5" /> : <span className="font-semibold">{index + 1}</span>}
                  </div>
                  <span
                    className={`hidden text-xs font-medium transition-colors duration-200 sm:block ${
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
                    className={`hidden h-0.5 flex-1 rounded-full sm:block ${
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


import React from 'react';
import { useFloating, autoUpdate, offset, flip, shift, arrow } from '@floating-ui/react-dom';
import { useRef } from 'react';

interface TutorialPopoverProps {
  referenceElement: HTMLElement | null;
  children: React.ReactNode;
  nextButton?: React.ReactNode;
  fixedPosition?: 'bottom' | 'top';
}

const TutorialPopover: React.FC<TutorialPopoverProps> = ({
  referenceElement,
  children,
  nextButton,
  fixedPosition,
}) => {
  const arrowRef = useRef(null);
  const { x, y, strategy, context, middlewareData } = useFloating({
    elements: {
      reference: referenceElement,
    },
    whileElementsMounted: autoUpdate,
    placement: 'bottom',
    middleware: [
      offset(10),
      flip(),
      shift(),
      arrow({ element: arrowRef }),
    ],
  });

  const isPositioned = referenceElement && x != null && y != null;

  if (fixedPosition === 'bottom') {
    return (
      <div className="fixed bottom-20 left-0 right-0 z-50 mx-auto w-full max-w-md px-4">
        <div
          role="dialog"
          aria-modal="false"
          className="relative w-full rounded-xl border border-slate-800/80 bg-slate-950/95 p-5 shadow-2xl shadow-cyan-500/10 backdrop-blur"
        >
          {children}
          {nextButton}
        </div>
      </div>
    );
  }

  if (!isPositioned) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div
          role="dialog"
          aria-modal="true"
          className="relative z-10 w-full max-w-md rounded-xl border border-slate-800/80 bg-slate-950/95 p-5 shadow-2xl shadow-cyan-500/10"
        >
          {children}
          {nextButton}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={context ? context.refs.setFloating : null}
      style={{
        position: strategy,
        top: y ?? 0,
        left: x ?? 0,
        width: 'max-content',
      }}
      role="dialog"
      aria-modal="false"
      className="z-50 rounded-xl border border-slate-800/80 bg-slate-950/95 px-5 py-4 text-slate-100 shadow-2xl shadow-cyan-500/10 backdrop-blur"
    >
      {children}
      {nextButton}
      <div
        ref={arrowRef}
        className="absolute h-3 w-3 rotate-45 border border-slate-800/80 bg-slate-950/95"
        style={{
          left: middlewareData.arrow?.x ?? '',
          top: middlewareData.arrow?.y ?? '',
        }}
      />
    </div>
  );
};

export default TutorialPopover;

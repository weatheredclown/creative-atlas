
import React from 'react';
import { useFloating, autoUpdate, offset, flip, shift, arrow } from '@floating-ui/react-dom';
import { useRef } from 'react';

interface TutorialPopoverProps {
  referenceElement: HTMLElement | null;
  children: React.ReactNode;
  nextButton?: React.ReactNode;
}

const TutorialPopover: React.FC<TutorialPopoverProps> = ({ referenceElement, children, nextButton }) => {
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

  if (!referenceElement) {
    return null;
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

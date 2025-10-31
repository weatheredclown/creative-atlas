
import React from 'react';
import { useFloating, autoUpdate, offset, flip, shift, arrow } from '@floating-ui/react-dom';
import { useRef } from 'react';

interface TutorialPopoverProps {
  referenceElement: HTMLElement | null;
  children: React.ReactNode;
}

const TutorialPopover: React.FC<TutorialPopoverProps> = ({ referenceElement, children }) => {
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
      className="bg-white rounded-lg shadow-lg p-4 z-50"
    >
      {children}
      <div
        ref={arrowRef}
        className="absolute bg-white w-4 h-4 transform rotate-45"
        style={{
          left: middlewareData.arrow?.x ?? '',
          top: middlewareData.arrow?.y ?? '',
        }}
      />
    </div>
  );
};

export default TutorialPopover;

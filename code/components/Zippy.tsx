import React, { useEffect, useRef, useState } from 'react';

interface ZippyProps {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

const Zippy: React.FC<ZippyProps> = ({ isOpen, children, className, id }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<string>(isOpen ? 'auto' : '0px');

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return undefined;

    const fullHeight = `${element.scrollHeight}px`;

    if (isOpen) {
      setHeight(fullHeight);
      const timeout = window.setTimeout(() => {
        setHeight('auto');
      }, 300);
      return () => window.clearTimeout(timeout);
    }

    setHeight(fullHeight);
    const frame = typeof window !== 'undefined' ? window.requestAnimationFrame(() => setHeight('0px')) : null;
    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [isOpen, children]);

  return (
    <div
      id={id}
      className={className}
      style={{
        height,
        overflow: 'hidden',
        opacity: isOpen ? 1 : 0,
        transition: 'height 300ms ease, opacity 300ms ease',
      }}
      aria-hidden={!isOpen}
    >
      <div ref={contentRef}>{children}</div>
    </div>
  );
};

export default Zippy;

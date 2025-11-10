import React, { useEffect, useState } from 'react';

import { ArrowUpTrayIcon } from './Icons';

const BackToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleScroll = () => {
      setIsVisible(window.scrollY > 600);
    };

    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  const scrollToTop = () => {
    if (typeof window === 'undefined') {
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50">
      <button
        type="button"
        onClick={scrollToTop}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-cyan-500/50 bg-slate-900/90 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-cyan-100 shadow-lg shadow-cyan-900/20 transition-colors hover:bg-slate-800/90 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 focus:ring-offset-2 focus:ring-offset-slate-950"
      >
        <ArrowUpTrayIcon className="h-4 w-4" />
        Back to top
      </button>
    </div>
  );
};

export default BackToTopButton;


import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from './Icons';
import { supportFaqEntries } from '../src/data/supportFaqs';

interface SupportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const SupportDrawer: React.FC<SupportDrawerProps> = ({ isOpen, onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside
        className="ml-auto flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto border-l border-slate-800/80 bg-slate-950/95 p-6 text-slate-100 shadow-2xl shadow-slate-950/50"
        role="dialog"
        aria-modal="true"
        aria-label="Support drawer"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Support & FAQ</p>
            <h2 className="text-2xl font-semibold text-white">Help Center</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-600/60 p-2 text-slate-200 transition-colors hover:border-slate-400/80 hover:text-white"
            aria-label="Close support drawer"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          <p className="text-sm text-slate-300">
            Find answers to common questions and learn how to get the most out of Creative Atlas.
          </p>

          <div className="space-y-4">
            {supportFaqEntries.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <h3 className="font-semibold text-slate-100 mb-2">{entry.question}</h3>
                <p className="text-sm text-slate-300 mb-3">{entry.answer}</p>

                {entry.recommendedNextSteps.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800/50">
                    <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Try this:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {entry.recommendedNextSteps.map((step, idx) => (
                        <li key={idx} className="text-xs text-slate-400">{step}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                    {entry.tags.map(tag => (
                        <span key={tag} className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-400">
                            #{tag}
                        </span>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
};

export default SupportDrawer;

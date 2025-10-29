import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type ToastVariant = 'info' | 'success' | 'error';

interface ShowToastOptions {
  title?: string;
  description: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastRecord extends ShowToastOptions {
  id: number;
}

interface ToastContextValue {
  showToast: (options: ShowToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const variantClasses: Record<ToastVariant, string> = {
  info: 'bg-slate-900/80 border border-slate-700 text-slate-100 shadow-lg shadow-slate-950/40',
  success: 'bg-emerald-900/80 border border-emerald-700 text-emerald-100 shadow-lg shadow-emerald-950/30',
  error: 'bg-rose-950/85 border border-rose-800 text-rose-100 shadow-lg shadow-rose-950/30',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timeoutRegistry = useRef(new Map<number, number>());

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
    const timeoutId = timeoutRegistry.current.get(id);
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      timeoutRegistry.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    ({ title, description, variant = 'info', duration = 4000 }: ShowToastOptions) => {
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { id, title, description, variant, duration }]);
      const timeoutId = window.setTimeout(() => removeToast(id), duration);
      timeoutRegistry.current.set(id, timeoutId);
    },
    [removeToast],
  );

  useEffect(() => {
    return () => {
      timeoutRegistry.current.forEach(timeoutId => window.clearTimeout(timeoutId));
      timeoutRegistry.current.clear();
    };
  }, []);

  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-3 px-4">
        {toasts.map(({ id, title, description, variant }) => (
          <div
            key={id}
            className={`pointer-events-auto w-full max-w-sm rounded-lg px-4 py-3 ${variantClasses[variant]}`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                {title ? <p className="text-sm font-semibold leading-tight">{title}</p> : null}
                <p className="text-sm leading-snug">{description}</p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(id)}
                className="rounded-md p-1 text-xs uppercase tracking-wide text-current transition hover:bg-white/10"
                aria-label="Dismiss notification"
              >
                Close
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;

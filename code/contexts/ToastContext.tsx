import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ToastVariant = 'info' | 'success' | 'error';

export interface ToastOptions {
  variant?: ToastVariant;
  duration?: number;
}

interface ToastMessage {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_DURATION = 5000;

type ToastListener = (message: string, options?: ToastOptions) => void;

const toastListeners = new Set<ToastListener>();

export const emitToast = (message: string, options?: ToastOptions) => {
  toastListeners.forEach((listener) => {
    listener(message, options);
  });
};

export const subscribeToToasts = (listener: ToastListener) => {
  toastListeners.add(listener);
  return () => {
    toastListeners.delete(listener);
  };
};

const getVariantStyles = (variant: ToastVariant): string => {
  switch (variant) {
    case 'success':
      return 'border-emerald-400/60 bg-emerald-900/80 text-emerald-50 shadow-emerald-900/60';
    case 'error':
      return 'border-rose-400/60 bg-rose-900/80 text-rose-50 shadow-rose-900/60';
    default:
      return 'border-slate-400/60 bg-slate-900/80 text-slate-100 shadow-slate-900/60';
  }
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const { variant = 'info', duration = TOAST_DURATION } = options;
      const id = Date.now() + Math.random();

      setToasts((previous) => [...previous, { id, message, variant }]);

      setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast],
  );

  const contextValue = useMemo<ToastContextValue>(() => ({
    showToast,
  }), [showToast]);

  useEffect(() => {
    const unsubscribe = subscribeToToasts(showToast);
    return () => unsubscribe();
  }, [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-xs flex-col gap-2 sm:max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur ${getVariantStyles(toast.variant)}`}
          >
            <div className="flex items-start gap-3">
              <p className="flex-1 leading-5">{toast.message}</p>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => removeToast(toast.id)}
                className="ml-2 text-xs font-medium uppercase tracking-wide text-white/70 transition hover:text-white"
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

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

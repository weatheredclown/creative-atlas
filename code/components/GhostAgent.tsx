import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  requestGhostAgentStep,
  type GhostAgentAction,
  type GhostAgentHistoryEntry,
} from '../services/ghostAgentClient';
import { SparklesIcon, XMarkIcon } from './Icons';

type Html2CanvasFn = typeof import('html2canvas')['default'];

const AGENT_UI_ID = 'ghost-agent-ui';
const MAX_STEPS = 20;
const MAX_LOGS = 10;
const HISTORY_LIMIT = 40;
const CURSOR_MOVE_DELAY_MS = 700;
const POST_ACTION_DELAY_MS = 1200;

const delay = (ms: number): Promise<void> =>
  new Promise(resolve => {
    window.setTimeout(resolve, ms);
  });

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const normalizeCoordinate = (value: unknown, max: number): number | null => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  if (value <= 1) {
    return clamp(Math.round(value * max), 0, max);
  }

  if (value <= max * 1.5) {
    return clamp(Math.round(value), 0, max);
  }

  if (value <= 1000) {
    return clamp(Math.round((value / 1000) * max), 0, max);
  }

  return clamp(Math.round(value), 0, max);
};

const setReactInputValue = (element: HTMLInputElement | HTMLTextAreaElement, text: string): void => {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  const setter = descriptor?.set;

  if (setter) {
    setter.call(element, text);
  } else {
    element.value = text;
  }

  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
};

const GhostCursorIcon: React.FC<{ isClicking: boolean }> = ({ isClicking }) => (
  <div className="relative">
    <svg
      width={28}
      height={28}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-md"
    >
      <path
        d="M6 1.5c-.552 0-1 .448-1 1v22c0 .89 1.077 1.337 1.707.707l4.293-4.293 2.586 5.172c.403.806 1.597.678 1.89-.205l6-18c.25-.75-.5-1.5-1.25-1.25l-18 6C1.343 13.114 1.471 14.308 2.277 14.71l5.172 2.586L3.156 21.59c-.63.63-.184 1.707.707 1.707h22c.552 0 1-.448 1-1v-22c0-.89-1.077-1.337-1.707-.707l-22 22"
        fill="#2563eb"
        stroke="white"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </svg>
    <AnimatePresence>
      {isClicking ? (
        <motion.span
          key="ghost-cursor-click"
          className="absolute -inset-3 rounded-full bg-blue-500/40"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 0.6, scale: 1 }}
          exit={{ opacity: 0, scale: 0.2 }}
          transition={{ duration: 0.2 }}
        />
      ) : null}
    </AnimatePresence>
  </div>
);

const StopIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
    <path
      fillRule="evenodd"
      d="M10 1.667a8.333 8.333 0 110 16.666 8.333 8.333 0 010-16.666zm-3 4.5A.5.5 0 006.5 6.5v7a.5.5 0 00.5.5h7a.5.5 0 00.5-.5v-7a.5.5 0 00-.5-.5h-7z"
      clipRule="evenodd"
    />
  </svg>
);

const GhostAgent: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [objective, setObjective] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isClicking, setIsClicking] = useState(false);

  const objectiveFieldId = useId();

  const isRunningRef = useRef(false);
  const historyRef = useRef<GhostAgentHistoryEntry[]>([]);
  const html2CanvasRef = useRef<Html2CanvasFn | null>(null);

  const addLog = useCallback((message: string) => {
    setLogs(previous => [...previous.slice(-(MAX_LOGS - 1)), message]);
  }, []);

  const loadHtml2Canvas = useCallback(async (): Promise<Html2CanvasFn> => {
    if (html2CanvasRef.current) {
      return html2CanvasRef.current;
    }

    const module = await import('html2canvas');
    const fn = (module.default ?? module) as Html2CanvasFn;

    if (typeof fn !== 'function') {
      throw new Error('html2canvas failed to load.');
    }

    html2CanvasRef.current = fn;
    return fn;
  }, []);

  const captureScreen = useCallback(async (): Promise<string | null> => {
    try {
      const html2canvas = await loadHtml2Canvas();
      const options: Parameters<Html2CanvasFn>[1] = {
        scale: 1,
        useCORS: true,
        logging: false,
        ignoreElements: element =>
          element?.id === AGENT_UI_ID || element?.classList.contains('ghost-agent-ignore'),
      };

      const canvas = await html2canvas(document.body, options);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      const [, base64] = dataUrl.split(',');
      return base64 ?? null;
    } catch (error) {
      console.error('Screen capture failed', error);
      addLog('❌ Unable to capture the screen. Please try again.');
      return null;
    }
  }, [addLog, loadHtml2Canvas]);

  const stopAgent = useCallback((message?: string) => {
    isRunningRef.current = false;
    setIsRunning(false);
    if (message) {
      addLog(message);
    }
  }, [addLog]);

  const updateCursor = useCallback((x: number, y: number) => {
    setCursorPos({ x, y });
  }, []);

  const executeAction = useCallback(
    async (action: GhostAgentAction | null): Promise<boolean> => {
      if (!action) {
        addLog('❌ Agent returned an empty action.');
        return false;
      }

      const actionLabel = action.action;
      const reasoning = typeof action.reasoning === 'string' ? action.reasoning.trim() : '';

      if (reasoning) {
        addLog(`🤖 ${reasoning}`);
      }

      if (actionLabel === 'done') {
        addLog('✅ Objective complete.');
        return false;
      }

      if (actionLabel === 'scroll') {
        const targetY = normalizeCoordinate(action.y, Math.max(document.body.scrollHeight, window.innerHeight));
        const targetX = normalizeCoordinate(action.x ?? 0, Math.max(document.body.scrollWidth, window.innerWidth));

        if (targetY === null) {
          addLog('⚠️ Scroll action was missing coordinates.');
          return true;
        }

        window.scrollTo({
          top: targetY,
          left: targetX ?? 0,
          behavior: 'smooth',
        });
        await delay(CURSOR_MOVE_DELAY_MS / 2);
        return true;
      }

      const screenX = normalizeCoordinate(action.x, window.innerWidth);
      const screenY = normalizeCoordinate(action.y, window.innerHeight);

      if (screenX === null || screenY === null) {
        addLog('⚠️ Action was missing screen coordinates.');
        return true;
      }

      updateCursor(screenX, screenY);
      await delay(CURSOR_MOVE_DELAY_MS);

      if (!isRunningRef.current) {
        return false;
      }

      const target = document.elementFromPoint(screenX, screenY);

      if (!(target instanceof HTMLElement)) {
        addLog('⚠️ No interactive element found at the requested location.');
        return true;
      }

      if (actionLabel === 'click') {
        setIsClicking(true);
        target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        target.click();
        await delay(180);
        setIsClicking(false);
        if (target instanceof HTMLElement) {
          target.focus({ preventScroll: true });
        }
        return true;
      }

      if (actionLabel === 'type') {
        const text = typeof action.text === 'string' ? action.text : '';

        if (text.length === 0) {
          addLog('⚠️ Type action did not include any text.');
          return true;
        }

        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
          target.focus({ preventScroll: true });
          setReactInputValue(target, text);
          return true;
        }

        if (target.isContentEditable) {
          target.focus({ preventScroll: true });
          document.execCommand('selectAll', false, undefined);
          document.execCommand('insertText', false, text);
          return true;
        }

        target.textContent = text;
        return true;
      }

      addLog(`⚠️ Unsupported action received: ${actionLabel}`);
      return true;
    },
    [addLog, updateCursor],
  );

  const runAgentLoop = useCallback(async () => {
    const trimmedObjective = objective.trim();
    if (!trimmedObjective) {
      return;
    }

    setLogs([]);
    addLog(`🎯 Objective: ${trimmedObjective}`);
    setIsRunning(true);
    isRunningRef.current = true;
    historyRef.current = [];

    try {
      for (let step = 0; step < MAX_STEPS && isRunningRef.current; step += 1) {
        const screenshot = await captureScreen();

        if (!screenshot) {
          stopAgent('❌ Agent stopped because the screenshot could not be captured.');
          return;
        }

        let action: GhostAgentAction | null = null;
        try {
          action = await requestGhostAgentStep({
            objective: trimmedObjective,
            screenshotBase64: screenshot,
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            history: historyRef.current,
          });
        } catch (error) {
          console.error('Ghost agent request failed', error);
          const message =
            error instanceof Error && error.message.length > 0
              ? error.message
              : 'Ghost agent request failed.';
          stopAgent(`❌ ${message}`);
          return;
        }

        historyRef.current = [...historyRef.current.slice(-(HISTORY_LIMIT - 1)), action];

        const shouldContinue = await executeAction(action);

        if (!shouldContinue || !isRunningRef.current) {
          break;
        }

        await delay(POST_ACTION_DELAY_MS);
      }
    } finally {
      stopAgent();
    }
  }, [addLog, captureScreen, executeAction, objective, stopAgent]);

  const handleStop = useCallback(() => {
    stopAgent('⏹️ Agent paused.');
  }, [stopAgent]);

  useEffect(() => {
    return () => {
      isRunningRef.current = false;
    };
  }, []);

  const isStartDisabled = useMemo(() => isRunning || objective.trim().length === 0, [isRunning, objective]);

  return (
    <>
      <AnimatePresence>
        {isRunning ? (
          <motion.div
            key="ghost-agent-cursor"
            className="fixed z-[9999] pointer-events-none"
            initial={{ x: cursorPos.x, y: cursorPos.y, opacity: 0 }}
            animate={{ x: cursorPos.x, y: cursorPos.y, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 25 }}
          >
            <GhostCursorIcon isClicking={isClicking} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div
        id={AGENT_UI_ID}
        className="fixed top-4 right-4 z-[10000] flex flex-col items-end text-sm"
      >
        {!isOpen ? (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-slate-900/80 shadow-lg backdrop-blur transition hover:bg-slate-900"
            aria-label="Open Creative Atlas ghost agent"
          >
            <SparklesIcon className="h-6 w-6 text-indigo-300" />
          </button>
        ) : (
          <div className="w-80 overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between bg-indigo-600/90 px-4 py-3 text-sm font-semibold text-white">
              <span className="flex items-center gap-2">
                <SparklesIcon className="h-4 w-4" />
                Creative Atlas Agent
              </span>
              <button
                type="button"
                onClick={() => {
                  if (isRunningRef.current) {
                    stopAgent('⏹️ Agent closed.');
                  }
                  setIsOpen(false);
                }}
                className="rounded-full p-1 text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="Close agent"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-4 py-4">
              <label
                className="block text-xs font-semibold uppercase tracking-wide text-indigo-200"
                htmlFor={objectiveFieldId}
              >
                Objective
              </label>
              <textarea
                id={objectiveFieldId}
                className="h-28 w-full resize-none rounded-lg border border-white/10 bg-slate-950/60 p-3 text-sm text-slate-100 shadow-inner focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-70"
                placeholder="Describe what you want the agent to build..."
                value={objective}
                onChange={event => setObjective(event.target.value)}
                disabled={isRunning}
              />

              {isRunning ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-indigo-200">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-300" />
                    Agent is working...
                  </div>
                  <div className="ghost-agent-ignore h-36 overflow-y-auto rounded-lg border border-white/10 bg-slate-950/50 p-3 font-mono text-[11px] leading-relaxed text-slate-200">
                    {logs.map((entry, index) => (
                      <div key={`${entry}-${index}`} className="border-b border-white/10 pb-1 last:border-0 last:pb-0">
                        {entry}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleStop}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 font-medium text-red-200 transition hover:bg-red-500/20"
                  >
                    <StopIcon className="h-4 w-4" />
                    Stop agent
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    void runAgentLoop();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-3 py-2 font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isStartDisabled}
                >
                  <span>Start automation</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default GhostAgent;

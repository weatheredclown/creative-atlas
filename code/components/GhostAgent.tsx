import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
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
const CALIBRATION_STORAGE_KEY = 'ghost-agent-calibration-history';
const CALIBRATION_OBJECTIVE =
  'Calibration check: Move the ghost cursor into the center of the red calibration square on the screen, then report done once you are fully inside the square.';
const CALIBRATION_HISTORY_LIMIT = 12;

interface CalibrationTarget {
  x: number;
  y: number;
  size: number;
}

interface CalibrationHistoryEntry {
  id: string;
  startedAt: string;
  completedAt: string;
  success: boolean;
  target: CalibrationTarget;
  finalCursor: { x: number; y: number } | null;
  offset: { x: number; y: number } | null;
  distance: number | null;
  notes: string[];
}

interface CalibrationRun {
  id: string;
  target: CalibrationTarget;
  startedAt: number;
  previousObjective: string;
  hasRecordedResult: boolean;
}

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

  const clampPixels = (pixels: number): number => clamp(Math.round(pixels), 0, max);
  const clampRatio = (ratio: number): number => clampPixels(ratio * max);

  if (value <= 1) {
    return clampRatio(value);
  }

  if (value <= 100) {
    return clampRatio(value / 100);
  }

  if (value <= 1000) {
    if (value > max || max > 1000) {
      return clampRatio(value / 1000);
    }

    return clampPixels(value);
  }

  if (value <= max * 1.5) {
    return clampPixels(value);
  }

  return clampPixels(value);
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

const isPointInsideTarget = (point: { x: number; y: number }, target: CalibrationTarget): boolean => {
  return (
    point.x >= target.x &&
    point.x <= target.x + target.size &&
    point.y >= target.y &&
    point.y <= target.y + target.size
  );
};

const generateCalibrationTarget = (): CalibrationTarget => {
  const size = Math.min(140, Math.max(90, Math.round(window.innerWidth * 0.12)));
  const horizontalMargin = Math.max(48, Math.round(size * 0.75));
  const verticalMargin = Math.max(120, Math.round(size * 0.75));
  const availableWidth = Math.max(window.innerWidth - size - horizontalMargin * 2, 0);
  const availableHeight = Math.max(window.innerHeight - size - verticalMargin * 2, 0);
  const x = Math.round(horizontalMargin + Math.random() * availableWidth);
  const y = Math.round(verticalMargin + Math.random() * availableHeight);
  return { x, y, size };
};

const loadCalibrationHistory = (): CalibrationHistoryEntry[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const stored = window.localStorage.getItem(CALIBRATION_STORAGE_KEY);
  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry: unknown): entry is CalibrationHistoryEntry => {
      if (!entry || typeof entry !== 'object') {
        return false;
      }

      const candidate = entry as Partial<CalibrationHistoryEntry>;
      return (
        typeof candidate.id === 'string' &&
        typeof candidate.startedAt === 'string' &&
        typeof candidate.completedAt === 'string' &&
        typeof candidate.success === 'boolean' &&
        candidate.target !== undefined
      );
    });
  } catch (error) {
    console.warn('Unable to parse calibration history', error);
    return [];
  }
};

const persistCalibrationHistory = (entries: CalibrationHistoryEntry[]): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.warn('Failed to persist calibration history', error);
  }
};

const deriveCalibrationNotes = (
  success: boolean,
  offset: { x: number; y: number } | null,
  distance: number | null,
  finalCursor: { x: number; y: number } | null,
): string[] => {
  const notes: string[] = [];

  if (success) {
    notes.push('Calibration succeeded: the cursor reached the red square.');
    if (offset) {
      const absX = Math.abs(offset.x);
      const absY = Math.abs(offset.y);
      if (absX > 4 || absY > 4) {
        notes.push(
          `Cursor stopped ${absX}px horizontally and ${absY}px vertically from the square center. Consider fine-tuning coordinate scaling if this offset is consistent.`,
        );
      }
    }
    return notes;
  }

  notes.push('Calibration failed: the agent stopped before entering the red square.');

  if (!finalCursor) {
    notes.push('The ghost cursor never moved. Verify the agent is producing move/click actions.');
    return notes;
  }

  if (distance !== null) {
    notes.push(`Final cursor position was ${distance}px away from the square center.`);
  }

  if (offset) {
    const { x, y } = offset;
    if (Math.abs(x) > Math.abs(y) * 1.5) {
      notes.push('Cursor drift was primarily horizontal. Inspect viewport width normalization.');
    } else if (Math.abs(y) > Math.abs(x) * 1.5) {
      notes.push('Cursor drift was primarily vertical. Inspect viewport height normalization.');
    } else {
      notes.push('Cursor drift was diagonal. Check both axes and consider capturing additional calibration samples.');
    }
  }

  return notes;
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

export interface GhostAgentHandle {
  open: () => void;
  close: () => void;
  toggle: () => void;
}

interface GhostAgentProps {
  showTriggerButton?: boolean;
}

const GhostAgent = forwardRef<GhostAgentHandle, GhostAgentProps>(({ showTriggerButton = true }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [objective, setObjective] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [isAwaitingFeedback, setIsAwaitingFeedback] = useState(false);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isClicking, setIsClicking] = useState(false);
  const [calibrationOverlay, setCalibrationOverlay] = useState<CalibrationTarget | null>(null);
  const [calibrationHistory, setCalibrationHistory] = useState<CalibrationHistoryEntry[]>([]);

  const objectiveFieldId = useId();
  const feedbackFieldId = useId();

  const isRunningRef = useRef(false);
  const historyRef = useRef<GhostAgentHistoryEntry[]>([]);
  const stepCountRef = useRef(0);
  const html2CanvasRef = useRef<Html2CanvasFn | null>(null);
  const cursorPosRef = useRef({ x: 0, y: 0 });
  const calibrationRunRef = useRef<CalibrationRun | null>(null);
  const calibrationShouldStopRef = useRef(false);
  const hasLoadedCalibrationHistoryRef = useRef(false);
  const hasCursorMovedRef = useRef(false);

  const addLog = useCallback((message: string) => {
    setLogs(previous => [...previous.slice(-(MAX_LOGS - 1)), message]);
  }, []);

  useEffect(() => {
    const history = loadCalibrationHistory();
    setCalibrationHistory(history);
    hasLoadedCalibrationHistoryRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoadedCalibrationHistoryRef.current) {
      return;
    }

    persistCalibrationHistory(calibrationHistory);
  }, [calibrationHistory]);

  const finalizeCalibration = useCallback(
    ({
      success,
      reason,
      finalCursor,
    }: {
      success: boolean;
      reason: string;
      finalCursor?: { x: number; y: number } | null;
    }) => {
      const run = calibrationRunRef.current;
      if (!run || run.hasRecordedResult) {
        return;
      }

      run.hasRecordedResult = true;

      const finalPoint =
        finalCursor ?? (hasCursorMovedRef.current ? { ...cursorPosRef.current } : null);
      const targetCenter = {
        x: run.target.x + run.target.size / 2,
        y: run.target.y + run.target.size / 2,
      };
      const offset = finalPoint
        ? {
            x: Math.round(finalPoint.x - targetCenter.x),
            y: Math.round(finalPoint.y - targetCenter.y),
          }
        : null;
      const distance = offset ? Math.round(Math.hypot(offset.x, offset.y)) : null;
      const notes = deriveCalibrationNotes(success, offset, distance, finalPoint ?? null);

      const entry: CalibrationHistoryEntry = {
        id: run.id,
        startedAt: new Date(run.startedAt).toISOString(),
        completedAt: new Date().toISOString(),
        success,
        target: run.target,
        finalCursor: finalPoint,
        offset,
        distance,
        notes,
      };

      setCalibrationHistory(previous => {
        const next = [...previous.slice(-(CALIBRATION_HISTORY_LIMIT - 1)), entry];
        return next;
      });

      setCalibrationOverlay(null);
      hasCursorMovedRef.current = false;
      calibrationRunRef.current = null;
      setObjective(run.previousObjective);

      if (notes.length > 0) {
        addLog(`📐 ${notes[0]}`);
        notes.slice(1, 3).forEach(note => {
          addLog(`🔍 ${note}`);
        });
      }

      if (!success) {
        addLog(`🛠️ ${reason}`);
      } else {
        addLog(`✅ ${reason}`);
      }
    },
    [addLog, setObjective],
  );

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

  const stopAgent = useCallback(
    (message?: string) => {
      if (calibrationRunRef.current && !calibrationRunRef.current.hasRecordedResult) {
        finalizeCalibration({
          success: false,
          reason: 'Agent stopped before reaching the calibration square.',
        });
      }

      calibrationShouldStopRef.current = false;
      isRunningRef.current = false;
      setIsRunning(false);
      setIsAwaitingFeedback(false);
      setPendingQuestion(null);
      setFeedbackInput('');
      stepCountRef.current = 0;
      historyRef.current = [];
      if (message) {
        addLog(message);
      }
    },
    [addLog, finalizeCalibration],
  );

  const updateCursor = useCallback(
    (x: number, y: number) => {
      cursorPosRef.current = { x, y };
      setCursorPos({ x, y });
      hasCursorMovedRef.current = true;

      const run = calibrationRunRef.current;
      if (run && !run.hasRecordedResult) {
        const point = { x, y };
        if (isPointInsideTarget(point, run.target)) {
          calibrationShouldStopRef.current = true;
          finalizeCalibration({
            success: true,
            reason: 'Calibration check succeeded: cursor entered the red square.',
            finalCursor: point,
          });
        }
      }
    },
    [finalizeCalibration],
  );

  const executeAction = useCallback(
    async (action: GhostAgentAction | null): Promise<'continue' | 'pause' | 'stop'> => {
      if (!action) {
        addLog('❌ Agent returned an empty action.');
        return 'stop';
      }

      const actionLabel = action.action;
      const reasoning = typeof action.reasoning === 'string' ? action.reasoning.trim() : '';

      if (reasoning) {
        addLog(`🤖 ${reasoning}`);
      }

      if (actionLabel === 'done') {
        addLog('✅ Objective complete.');
        return 'stop';
      }

      if (actionLabel === 'ask') {
        const prompt = typeof action.prompt === 'string' ? action.prompt.trim() : '';
        const guidanceMessage = prompt.length > 0 ? prompt : 'The agent needs additional instructions from the user.';
        addLog(`🟠 ${guidanceMessage}`);
        setPendingQuestion(guidanceMessage);
        setIsAwaitingFeedback(true);
        setFeedbackInput('');
        return 'pause';
      }

      if (actionLabel === 'scroll') {
        const targetY = normalizeCoordinate(action.y, Math.max(document.body.scrollHeight, window.innerHeight));
        const targetX = normalizeCoordinate(action.x ?? 0, Math.max(document.body.scrollWidth, window.innerWidth));

        if (targetY === null) {
          addLog('⚠️ Scroll action was missing coordinates.');
          return 'continue';
        }

        window.scrollTo({
          top: targetY,
          left: targetX ?? 0,
          behavior: 'smooth',
        });
        await delay(CURSOR_MOVE_DELAY_MS / 2);
        return 'continue';
      }

      const screenX = normalizeCoordinate(action.x, window.innerWidth);
      const screenY = normalizeCoordinate(action.y, window.innerHeight);

      if (screenX === null || screenY === null) {
        addLog('⚠️ Action was missing screen coordinates.');
        return 'continue';
      }

      updateCursor(screenX, screenY);

      if (calibrationShouldStopRef.current) {
        calibrationShouldStopRef.current = false;
        return 'stop';
      }

      await delay(CURSOR_MOVE_DELAY_MS);

      if (!isRunningRef.current) {
        return 'stop';
      }

      const target = document.elementFromPoint(screenX, screenY);

      if (!(target instanceof HTMLElement)) {
        addLog('⚠️ No interactive element found at the requested location.');
        return 'continue';
      }

      if (actionLabel === 'click') {
        setIsClicking(true);
        target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        target.click();
        await delay(180);
        setIsClicking(false);
        target.focus({ preventScroll: true });
        return 'continue';
      }

      if (actionLabel === 'type') {
        const text = typeof action.text === 'string' ? action.text : '';

        if (text.length === 0) {
          addLog('⚠️ Type action did not include any text.');
          return 'continue';
        }

        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
          target.focus({ preventScroll: true });
          setReactInputValue(target, text);
          return 'continue';
        }

        if (target.isContentEditable) {
          target.focus({ preventScroll: true });
          document.execCommand('selectAll', false, undefined);
          document.execCommand('insertText', false, text);
          return 'continue';
        }

        target.textContent = text;
        return 'continue';
      }

      addLog(`⚠️ Unsupported action received: ${actionLabel}`);
      return 'continue';
    },
    [addLog, setFeedbackInput, setIsAwaitingFeedback, setPendingQuestion, updateCursor],
  );

  const runAgentLoop = useCallback(
    async ({
      isResuming = false,
      overrideObjective,
    }: { isResuming?: boolean; overrideObjective?: string } = {}) => {
      const activeObjective = overrideObjective ?? objective;
      const trimmedObjective = activeObjective.trim();
      if (!trimmedObjective) {
        return;
      }

      if (!isResuming) {
        setLogs([]);
        addLog(`🎯 Objective: ${trimmedObjective}`);
        historyRef.current = [];
        stepCountRef.current = 0;
      } else {
        addLog('🔄 Agent resuming with your guidance.');
      }

      setIsRunning(true);
      isRunningRef.current = true;
      setIsAwaitingFeedback(false);
      setPendingQuestion(null);

      let pausedForFeedback = false;
      let shouldAutoStop = true;

      try {
        while (stepCountRef.current < MAX_STEPS && isRunningRef.current) {
          const screenshot = await captureScreen();

          if (!screenshot) {
            stopAgent('❌ Agent stopped because the screenshot could not be captured.');
            shouldAutoStop = false;
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
            shouldAutoStop = false;
            return;
          }

          const historyEntry: GhostAgentHistoryEntry = {
            role: 'agent',
            step: stepCountRef.current + 1,
            action,
          };
          historyRef.current = [...historyRef.current.slice(-(HISTORY_LIMIT - 1)), historyEntry];
          stepCountRef.current += 1;

          const result = await executeAction(action);

          if (result === 'stop' || !isRunningRef.current) {
            break;
          }

          if (result === 'pause') {
            pausedForFeedback = true;
            break;
          }

          await delay(POST_ACTION_DELAY_MS);
        }
      } finally {
        if (pausedForFeedback) {
          isRunningRef.current = false;
        } else if (shouldAutoStop) {
          stopAgent();
        }
      }
    },
    [addLog, captureScreen, executeAction, objective, setIsAwaitingFeedback, setPendingQuestion, stopAgent],
  );

  const handleStop = useCallback(() => {
    stopAgent('⏹️ Agent paused.');
  }, [stopAgent]);

  const handleStartCalibration = useCallback(() => {
    if (isRunning) {
      addLog('⚠️ Please wait for the current run to finish before starting calibration.');
      return;
    }

    if (typeof window === 'undefined') {
      addLog('⚠️ Calibration is only available in the browser environment.');
      return;
    }

    const target = generateCalibrationTarget();
    const runId = `cal-${Date.now()}`;

    calibrationRunRef.current = {
      id: runId,
      target,
      startedAt: Date.now(),
      previousObjective: objective,
      hasRecordedResult: false,
    };

    hasCursorMovedRef.current = false;
    calibrationShouldStopRef.current = false;
    setCalibrationOverlay(target);
    setObjective(CALIBRATION_OBJECTIVE);
    setIsOpen(true);

    window.setTimeout(() => {
      addLog(
        `🎯 Calibration target center at (${Math.round(
          target.x + target.size / 2,
        )}px, ${Math.round(target.y + target.size / 2)}px) with size ${target.size}px.`,
      );
      addLog('📐 Calibration mode: guiding the agent to the red square.');
    }, 0);

    void runAgentLoop({ overrideObjective: CALIBRATION_OBJECTIVE });
  }, [addLog, isRunning, objective, runAgentLoop]);

  const handleFeedbackSubmit = useCallback(() => {
    const trimmed = feedbackInput.trim();
    if (trimmed.length === 0) {
      return;
    }

    const historyEntry: GhostAgentHistoryEntry = {
      role: 'user',
      message: trimmed,
    };

    historyRef.current = [...historyRef.current.slice(-(HISTORY_LIMIT - 1)), historyEntry];
    addLog(`🧭 You: ${trimmed}`);
    setFeedbackInput('');
    setIsAwaitingFeedback(false);
    setPendingQuestion(null);

    void runAgentLoop({ isResuming: true });
  }, [addLog, feedbackInput, runAgentLoop]);

  useEffect(() => {
    return () => {
      isRunningRef.current = false;
    };
  }, []);

  const isStartDisabled = useMemo(() => isRunning || objective.trim().length === 0, [isRunning, objective]);

  const statusAccentClass = isAwaitingFeedback ? 'text-amber-200' : 'text-indigo-200';
  const statusDotClass = isAwaitingFeedback ? 'bg-amber-300' : 'bg-indigo-300';
  const statusText = isAwaitingFeedback ? 'Agent needs your guidance' : 'Agent is working...';
  const logContainerClass = isAwaitingFeedback
    ? 'ghost-agent-ignore h-36 overflow-y-auto rounded-lg border border-amber-300/40 bg-amber-950/40 p-3 font-mono text-[11px] leading-relaxed text-amber-100'
    : 'ghost-agent-ignore h-36 overflow-y-auto rounded-lg border border-white/10 bg-slate-950/50 p-3 font-mono text-[11px] leading-relaxed text-slate-200';
  const logDividerClass = isAwaitingFeedback ? 'border-amber-300/40' : 'border-white/10';
  const recentCalibrationHistory = useMemo(
    () => [...calibrationHistory].reverse().slice(0, 4),
    [calibrationHistory],
  );
  const calibrationStatusText = calibrationOverlay
    ? 'Calibration target active. The agent will stop automatically when the cursor enters the square.'
    : 'Run calibration to verify the ghost cursor is aligned with on-screen coordinates. Results are stored locally for future debugging sessions.';

  const closeAgent = useCallback(
    (message?: string) => {
      if (isRunningRef.current) {
        stopAgent(message ?? '⏹️ Agent closed.');
      }
      setIsOpen(false);
    },
    [stopAgent],
  );

  const openAgent = useCallback(() => {
    setIsOpen(true);
  }, []);

  const toggleAgent = useCallback(() => {
    setIsOpen(previous => {
      if (previous) {
        if (isRunningRef.current) {
          stopAgent('⏹️ Agent closed.');
        }
        return false;
      }

      return true;
    });
  }, [stopAgent]);

  useImperativeHandle(
    ref,
    () => ({
      open: openAgent,
      close: () => closeAgent(),
      toggle: toggleAgent,
    }),
    [closeAgent, openAgent, toggleAgent],
  );

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

      {calibrationOverlay ? (
        <div
          className="pointer-events-none fixed z-[9950]"
          style={{
            left: `${calibrationOverlay.x}px`,
            top: `${calibrationOverlay.y}px`,
            width: `${calibrationOverlay.size}px`,
            height: `${calibrationOverlay.size}px`,
          }}
        >
          <div className="absolute inset-0 rounded-lg border-4 border-red-500/80 bg-red-500/15 shadow-[0_0_30px_rgba(248,113,113,0.6)]" />
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-md bg-red-600 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow">
            Calibration target
          </div>
        </div>
      ) : null}

      {(isOpen || showTriggerButton) && (
        <div
          id={AGENT_UI_ID}
          className="fixed top-4 right-4 z-[10000] flex flex-col items-end text-sm"
        >
          {isOpen ? (
          <div
            className={`w-80 overflow-hidden rounded-xl border bg-slate-900/95 text-slate-100 shadow-2xl ${
              isAwaitingFeedback ? 'border-amber-400/60' : 'border-white/10'
            }`}
          >
            <div
              className={`flex items-center justify-between px-4 py-3 text-sm font-semibold text-white ${
                isAwaitingFeedback ? 'bg-amber-500/90' : 'bg-indigo-600/90'
              }`}
            >
              <span className="flex items-center gap-2">
                <SparklesIcon className="h-4 w-4" />
                Creative Atlas Agent
              </span>
              <button
                type="button"
                onClick={() => {
                  closeAgent();
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
                  <div className={`flex items-center gap-2 ${statusAccentClass}`}>
                    <span className={`h-2 w-2 animate-pulse rounded-full ${statusDotClass}`} />
                    {statusText}
                  </div>
                  <div className={logContainerClass}>
                    {logs.map((entry, index) => (
                      <div
                        key={`${entry}-${index}`}
                        className={`border-b pb-1 last:border-0 last:pb-0 ${logDividerClass}`}
                      >
                        {entry}
                      </div>
                    ))}
                  </div>
                  {isAwaitingFeedback ? (
                    <div className="space-y-3">
                      {pendingQuestion ? (
                        <div className="rounded-lg border border-amber-300/40 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-200">
                            Agent request
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-amber-100">{pendingQuestion}</p>
                        </div>
                      ) : null}
                      <div className="space-y-2">
                        <label
                          className="block text-xs font-semibold uppercase tracking-wide text-amber-200"
                          htmlFor={feedbackFieldId}
                        >
                          Your guidance
                        </label>
                        <textarea
                          id={feedbackFieldId}
                          className="h-24 w-full resize-none rounded-lg border border-amber-300/40 bg-amber-950/40 p-3 text-sm text-amber-100 shadow-inner focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                          placeholder="Describe what the agent should try next..."
                          value={feedbackInput}
                          onChange={event => setFeedbackInput(event.target.value)}
                          onKeyDown={event => {
                            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                              event.preventDefault();
                              handleFeedbackSubmit();
                            }
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleFeedbackSubmit}
                          className="flex-1 rounded-lg bg-amber-400 px-3 py-2 font-semibold text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={feedbackInput.trim().length === 0}
                        >
                          Send reply
                        </button>
                        <button
                          type="button"
                          onClick={handleStop}
                          className="flex items-center justify-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 font-medium text-red-200 transition hover:bg-red-500/20"
                        >
                          <StopIcon className="h-4 w-4" />
                          Stop agent
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStop}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 font-medium text-red-200 transition hover:bg-red-500/20"
                    >
                      <StopIcon className="h-4 w-4" />
                      Stop agent
                    </button>
                  )}
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
            <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Calibration</span>
                <button
                  type="button"
                  onClick={handleStartCalibration}
                  className="rounded-lg border border-red-400/70 px-3 py-1.5 text-xs font-semibold text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isRunning}
                >
                  Run calibration check
                </button>
              </div>
              <p className="text-xs leading-relaxed text-slate-300/80">{calibrationStatusText}</p>
              {recentCalibrationHistory.length > 0 ? (
                <div className="space-y-2">
                  {recentCalibrationHistory.map(entry => {
                    const timestamp = new Date(entry.completedAt);
                    const formattedTime = Number.isNaN(timestamp.getTime())
                      ? 'Unknown time'
                      : timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    const toneClass = entry.success ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100' : 'border-red-400/50 bg-red-500/10 text-red-100';

                    return (
                      <div
                        key={entry.id}
                        className={`rounded-lg border px-3 py-2 text-xs leading-relaxed ${toneClass}`}
                      >
                        <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-wide">
                          <span>{entry.success ? 'Success' : 'Needs attention'}</span>
                          <span className="text-[10px] font-medium tracking-normal text-white/70">{formattedTime}</span>
                        </div>
                        {entry.notes.length > 0 ? (
                          <p className="mt-1 text-xs text-white/90">{entry.notes[0]}</p>
                        ) : null}
                        {entry.offset ? (
                          <p className="mt-1 text-[11px] text-white/80">
                            Offset Δx {entry.offset.x}px, Δy {entry.offset.y}px
                          </p>
                        ) : (
                          <p className="mt-1 text-[11px] text-white/80">No cursor movement recorded.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-lg border border-white/10 bg-slate-800/60 px-3 py-2 text-xs text-slate-200/80">
                  No calibration runs yet. Use the button above to collect coordinate samples.
                </p>
              )}
            </div>
          </div>
          ) : (
            showTriggerButton && (
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-slate-900/80 shadow-lg backdrop-blur transition hover:bg-slate-900"
                aria-label="Open Creative Atlas ghost agent"
              >
                <SparklesIcon className="h-6 w-6 text-indigo-300" />
              </button>
            )
          )}
        </div>
      )}
    </>
  );
});

GhostAgent.displayName = 'GhostAgent';

export default GhostAgent;

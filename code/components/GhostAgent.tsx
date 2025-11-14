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

interface CalibrationTransformAnalysis {
  solved: boolean;
  summary: string;
  translation: { x: number; y: number } | null;
  scale: { x: number; y: number } | null;
  rotationDegrees: number | null;
  shearDegrees: number | null;
  determinant: number | null;
  reflection: boolean;
  residual: number | null;
  detailLines: string[];
}

interface CalibrationAggregate {
  sampleCount: number;
  successCount: number;
  failureCount: number;
  meanOffset: { x: number; y: number };
  meanAbsoluteOffset: { x: number; y: number };
  meanDistance: number | null;
  failureRate: number;
  severity: 'aligned' | 'watch' | 'critical';
  summary: string;
  recommendation: string | null;
  transform: CalibrationTransformAnalysis | null;
}

interface CalibrationRun {
  id: string;
  target: CalibrationTarget;
  startedAt: number;
  previousObjective: string;
  hasRecordedResult: boolean;
}

interface PayloadPreviewData {
  screenshotDataUrl: string;
  payloadSummary: {
    step: number;
    objective: string;
    screenWidth: number;
    screenHeight: number;
    history: GhostAgentHistoryEntry[];
    screenshotBase64Length: number;
    screenshotBase64Preview: string;
  };
}

const delay = (ms: number): Promise<void> =>
  new Promise(resolve => {
    window.setTimeout(resolve, ms);
  });

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const readViewportSize = (): { width: number; height: number } => {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }

  const viewport = window.visualViewport;
  const width = viewport?.width ?? window.innerWidth;
  const height = viewport?.height ?? window.innerHeight;

  return {
    width: Math.max(0, Math.round(width)),
    height: Math.max(0, Math.round(height)),
  };
};

const normalizeCoordinate = (value: unknown, max: number): number | null => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  const clampPixels = (pixels: number): number => clamp(Math.round(pixels), 0, max);

  if (value >= 0 && value <= 1) {
    return clampPixels(value * max);
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

const solveLeastSquares = (design: number[][], outputs: number[]): number[] | null => {
  const rowCount = design.length;
  const colCount = design[0]?.length ?? 0;

  if (rowCount === 0 || colCount === 0 || outputs.length !== rowCount) {
    return null;
  }

  const ata: number[][] = Array.from({ length: colCount }, () => Array(colCount).fill(0));
  const atb: number[] = Array(colCount).fill(0);

  for (let row = 0; row < rowCount; row += 1) {
    const current = design[row];
    const value = outputs[row];
    for (let col = 0; col < colCount; col += 1) {
      atb[col] += current[col] * value;
      for (let inner = col; inner < colCount; inner += 1) {
        ata[col][inner] += current[col] * current[inner];
      }
    }
  }

  for (let row = 0; row < colCount; row += 1) {
    for (let col = 0; col < row; col += 1) {
      ata[row][col] = ata[col][row];
    }
  }

  const augmented: number[][] = ata.map((row, index) => [...row, atb[index]]);

  const size = colCount;
  for (let pivotIndex = 0; pivotIndex < size; pivotIndex += 1) {
    let maxRow = pivotIndex;
    let maxValue = Math.abs(augmented[pivotIndex][pivotIndex]);

    for (let candidate = pivotIndex + 1; candidate < size; candidate += 1) {
      const candidateValue = Math.abs(augmented[candidate][pivotIndex]);
      if (candidateValue > maxValue) {
        maxValue = candidateValue;
        maxRow = candidate;
      }
    }

    if (maxValue < 1e-6) {
      return null;
    }

    if (maxRow !== pivotIndex) {
      const temp = augmented[pivotIndex];
      augmented[pivotIndex] = augmented[maxRow];
      augmented[maxRow] = temp;
    }

    const pivot = augmented[pivotIndex][pivotIndex];
    for (let column = pivotIndex; column <= size; column += 1) {
      augmented[pivotIndex][column] /= pivot;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === pivotIndex) {
        continue;
      }
      const factor = augmented[row][pivotIndex];
      if (Math.abs(factor) < 1e-9) {
        continue;
      }
      for (let column = pivotIndex; column <= size; column += 1) {
        augmented[row][column] -= factor * augmented[pivotIndex][column];
      }
    }
  }

  return augmented.map(row => row[size]);
};

const deriveTransformAnalysis = (
  entries: CalibrationHistoryEntry[],
): CalibrationTransformAnalysis | null => {
  const usableSamples = entries.filter(entry => entry.finalCursor !== null);
  if (usableSamples.length < 3) {
    return null;
  }

  const design: number[][] = [];
  const outputs: number[] = [];

  usableSamples.forEach(entry => {
    const centerX = entry.target.x + entry.target.size / 2;
    const centerY = entry.target.y + entry.target.size / 2;
    const finalX = entry.finalCursor?.x ?? 0;
    const finalY = entry.finalCursor?.y ?? 0;

    design.push([centerX, centerY, 0, 0, 1, 0]);
    outputs.push(finalX);
    design.push([0, 0, centerX, centerY, 0, 1]);
    outputs.push(finalY);
  });

  const solution = solveLeastSquares(design, outputs);
  if (!solution) {
    return {
      solved: false,
      summary: 'Not enough stable samples to model cursor transform.',
      translation: null,
      scale: null,
      rotationDegrees: null,
      shearDegrees: null,
      determinant: null,
      reflection: false,
      residual: null,
      detailLines: [],
    };
  }

  const [m11, m12, m21, m22, b1, b2] = solution;

  const matrix = [
    [m11, m12],
    [m21, m22],
  ];

  let squaredError = 0;
  usableSamples.forEach(entry => {
    const centerX = entry.target.x + entry.target.size / 2;
    const centerY = entry.target.y + entry.target.size / 2;
    const predictedX = m11 * centerX + m12 * centerY + b1;
    const predictedY = m21 * centerX + m22 * centerY + b2;
    const actualX = entry.finalCursor?.x ?? 0;
    const actualY = entry.finalCursor?.y ?? 0;
    squaredError += (predictedX - actualX) ** 2 + (predictedY - actualY) ** 2;
  });

  const residual = Math.sqrt(squaredError / usableSamples.length);

  const axisX = { x: matrix[0][0], y: matrix[1][0] };
  const axisY = { x: matrix[0][1], y: matrix[1][1] };
  const scaleX = Math.hypot(axisX.x, axisX.y);
  const scaleY = Math.hypot(axisY.x, axisY.y);
  const determinant = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
  const rotationRadians = scaleX > 0 ? Math.atan2(axisX.y, axisX.x) : null;
  const rotationDegrees = rotationRadians !== null ? (rotationRadians * 180) / Math.PI : null;
  let shearDegrees: number | null = null;
  if (scaleX > 0 && scaleY > 0) {
    const dotProduct = axisX.x * axisY.x + axisX.y * axisY.y;
    const cosine = dotProduct / (scaleX * scaleY);
    const clampedCosine = Math.min(1, Math.max(-1, cosine));
    const angleBetweenAxes = Math.acos(clampedCosine);
    shearDegrees = Math.abs((angleBetweenAxes * 180) / Math.PI - 90);
  }

  const translation = { x: Math.round(b1), y: Math.round(b2) };
  const reflection = determinant < 0;

  const details: string[] = [];
  details.push(`Translation ≈ (${translation.x}px, ${translation.y}px).`);
  details.push(
    `Scale ≈ (${scaleX.toFixed(2)}x horizontally, ${scaleY.toFixed(2)}x vertically).`,
  );
  if (rotationDegrees !== null) {
    details.push(`Rotation ≈ ${rotationDegrees.toFixed(1)}° (${rotationDegrees >= 0 ? 'CCW' : 'CW'}).`);
  }
  if (shearDegrees !== null && shearDegrees > 1) {
    details.push(`Axis skew ≈ ${shearDegrees.toFixed(1)}° from perpendicular.`);
  }
  details.push(`Mean residual error ≈ ${residual.toFixed(1)}px.`);

  let summary: string;
  if (reflection) {
    summary = 'Cursor behavior looks mirrored relative to the calibration targets.';
  } else if (rotationDegrees !== null && Math.abs(rotationDegrees) >= 15) {
    summary = `Cursor path is rotated ≈ ${rotationDegrees.toFixed(1)}° relative to screen coordinates.`;
  } else if (Math.max(Math.abs(scaleX - 1), Math.abs(scaleY - 1)) >= 0.2) {
    summary = 'Cursor path scales targets noticeably before landing, suggesting coordinate stretching.';
  } else if (shearDegrees !== null && shearDegrees >= 5) {
    summary = 'Cursor path exhibits skew relative to target axes, hinting at axis mixing.';
  } else {
    summary = 'Cursor path primarily translates targets with minimal rotation or mirroring.';
  }

  return {
    solved: true,
    summary,
    translation,
    scale: { x: parseFloat(scaleX.toFixed(2)), y: parseFloat(scaleY.toFixed(2)) },
    rotationDegrees: rotationDegrees !== null ? parseFloat(rotationDegrees.toFixed(1)) : null,
    shearDegrees: shearDegrees !== null ? parseFloat(shearDegrees.toFixed(1)) : null,
    determinant: parseFloat(determinant.toFixed(3)),
    reflection,
    residual: parseFloat(residual.toFixed(1)),
    detailLines: details,
  };
};

const deriveCalibrationAggregate = (
  history: CalibrationHistoryEntry[],
): CalibrationAggregate | null => {
  if (history.length === 0) {
    return null;
  }

  const samples = history.filter(entry => entry.offset !== null);
  if (samples.length === 0) {
    return null;
  }

  const successCount = history.filter(entry => entry.success).length;
  const failureCount = history.length - successCount;

  const sum = samples.reduce(
    (acc, entry) => {
      const offset = entry.offset ?? { x: 0, y: 0 };
      acc.offsetX += offset.x;
      acc.offsetY += offset.y;
      acc.absOffsetX += Math.abs(offset.x);
      acc.absOffsetY += Math.abs(offset.y);
      acc.distance +=
        entry.distance !== null && entry.distance !== undefined
          ? entry.distance
          : Math.round(Math.hypot(offset.x, offset.y));
      return acc;
    },
    { offsetX: 0, offsetY: 0, absOffsetX: 0, absOffsetY: 0, distance: 0 },
  );

  const meanOffset = {
    x: Math.round(sum.offsetX / samples.length),
    y: Math.round(sum.offsetY / samples.length),
  };
  const meanAbsoluteOffset = {
    x: Math.round(sum.absOffsetX / samples.length),
    y: Math.round(sum.absOffsetY / samples.length),
  };
  const meanDistance = samples.length > 0 ? Math.round(sum.distance / samples.length) : null;
  const failureRate = history.length > 0 ? failureCount / history.length : 0;

  let severity: CalibrationAggregate['severity'];
  if (meanAbsoluteOffset.x <= 6 && meanAbsoluteOffset.y <= 6) {
    severity = 'aligned';
  } else if (meanAbsoluteOffset.x <= 30 && meanAbsoluteOffset.y <= 30) {
    severity = 'watch';
  } else {
    severity = 'critical';
  }

  if (failureRate >= 0.5 && severity !== 'critical') {
    severity = 'watch';
  }

  const driftDescriptors: string[] = [];
  if (meanOffset.x !== 0) {
    driftDescriptors.push(
      `${Math.abs(meanOffset.x)}px ${meanOffset.x > 0 ? 'to the right' : 'to the left'}`,
    );
  }
  if (meanOffset.y !== 0) {
    driftDescriptors.push(
      `${Math.abs(meanOffset.y)}px ${meanOffset.y > 0 ? 'down' : 'up'}`,
    );
  }

  const transform = deriveTransformAnalysis(samples);

  if (transform?.reflection || (transform?.rotationDegrees && Math.abs(transform.rotationDegrees) >= 15)) {
    severity = 'critical';
  }

  const summary =
    driftDescriptors.length === 0
      ? 'Average cursor drift centers on the calibration target.'
      : `Average cursor drift trends ${driftDescriptors.join(' and ')}.`;

  const summaryParts = [summary];
  if (transform?.solved) {
    summaryParts.push(transform.summary);
  }

  let recommendationParts: string[] = [];
  if (severity === 'watch') {
    recommendationParts.push(
      'Drift is noticeable. Capture additional samples and verify the 0–1000 coordinate scaling matches the viewport.',
    );
  } else if (severity === 'critical') {
    recommendationParts.push(
      'Severe drift detected. Inspect the viewport normalization logic and consider resetting calibration data after adjustments.',
    );
  }

  if (transform?.solved) {
    if (transform.reflection) {
      recommendationParts.push(
        'Transform analysis suggests the cursor is mirrored. Check whether captured screenshots are flipped or if X/Y coordinates are inverted before sending them to the agent.',
      );
    } else if (transform.rotationDegrees && Math.abs(transform.rotationDegrees) >= 10) {
      recommendationParts.push(
        `Transform analysis detected a ~${Math.abs(transform.rotationDegrees)}° rotation. Verify the screenshot orientation and confirm width/height axes are mapped correctly.`,
      );
    } else if (
      transform.scale &&
      (Math.abs(transform.scale.x - 1) >= 0.15 || Math.abs(transform.scale.y - 1) >= 0.15)
    ) {
      recommendationParts.push(
        'Transform analysis shows scaling drift. Audit how viewport dimensions and screenshot resolutions are normalized before deriving cursor coordinates.',
      );
    } else if (transform.shearDegrees && transform.shearDegrees >= 5) {
      recommendationParts.push(
        'Transform analysis surfaced skewed axes. Double-check that coordinate calculations do not mix horizontal and vertical ratios.',
      );
    }
  }

  const recommendation = recommendationParts.length > 0 ? recommendationParts.join(' ') : null;

  return {
    sampleCount: samples.length,
    successCount,
    failureCount,
    meanOffset,
    meanAbsoluteOffset,
    meanDistance,
    failureRate,
    severity,
    summary: summaryParts.join(' '),
    recommendation,
    transform: transform ?? null,
  };
};

const GhostCursorIcon: React.FC<{ isClicking: boolean }> = ({ isClicking }) => (
  <div className="relative">
    <svg
      width={28}
      height={28}
      viewBox="0 0 28 28"
      fill="#2563eb"
      stroke="white"
      stroke-width="1.4"
      stroke-linejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M2.00001 13.9999L26 2L14.0001 26L12.0001 16L2.00001 13.9999Z" />
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

const PayloadPreviewModal: React.FC<{ preview: PayloadPreviewData; onClose: () => void }> = ({
  preview,
  onClose,
}) => {
  const payloadJson = useMemo(() => JSON.stringify(preview.payloadSummary, null, 2), [preview]);

  return (
    <div
      className="ghost-agent-ignore fixed inset-0 z-[10020] flex items-center justify-center bg-slate-950/80 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label="Ghost agent payload preview"
    >
      <div className="relative flex h-full w-full max-w-5xl items-center justify-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute inset-0 h-full w-full cursor-pointer bg-transparent"
          aria-label="Dismiss payload preview"
        />
        <div className="relative z-10 max-h-full w-full overflow-hidden rounded-2xl border border-white/15 bg-slate-900 shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-slate-900/80 px-5 py-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-indigo-200">
                Model payload preview
              </div>
              <div className="text-sm text-slate-100">Step {preview.payloadSummary.step}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-slate-900/70 p-2 text-slate-200 transition hover:bg-slate-800"
              aria-label="Close payload preview"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-4 overflow-y-auto p-5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-white/10 bg-black/60">
                <img
                  src={preview.screenshotDataUrl}
                  alt="Screenshot that will be sent to the model"
                  className="max-h-[70vh] w-full object-contain"
                />
              </div>
              <p className="text-xs text-slate-300/80">
                This is the captured html2canvas output that is encoded and sent with the agent request.
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-indigo-200">Objective</div>
                <p className="mt-1 whitespace-pre-wrap rounded-lg border border-white/10 bg-slate-950/60 p-3 text-sm leading-relaxed text-slate-100">
                  {preview.payloadSummary.objective || '—'}
                </p>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-indigo-200">Request payload</div>
                <pre className="mt-1 max-h-[60vh] overflow-auto rounded-lg border border-white/10 bg-slate-950/70 p-3 text-[11px] leading-relaxed text-slate-100">
                  {payloadJson}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const [payloadPreview, setPayloadPreview] = useState<PayloadPreviewData | null>(null);
  const [isPayloadPreviewOpen, setIsPayloadPreviewOpen] = useState(false);

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
  const lastViewportSizeRef = useRef<{ width: number; height: number } | null>(null);

  const addLog = useCallback((message: string) => {
    setLogs(previous => [...previous.slice(-(MAX_LOGS - 1)), message]);
  }, []);

  const handleResetCalibrationHistory = useCallback(() => {
    if (calibrationHistory.length === 0) {
      return;
    }

    if (typeof window !== 'undefined') {
      const shouldReset = window.confirm('Clear saved calibration history? This cannot be undone.');
      if (!shouldReset) {
        return;
      }
    }

    setCalibrationHistory([]);

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(CALIBRATION_STORAGE_KEY);
      } catch (error) {
        console.warn('Failed to clear calibration history', error);
      }
    }

    addLog('🧹 Cleared calibration history.');
  }, [addLog, calibrationHistory.length]);

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

  interface CapturedScreenshot {
    base64: string;
    dataUrl: string;
    viewport: { width: number; height: number };
  }

  const captureScreen = useCallback(async (): Promise<CapturedScreenshot | null> => {
    try {
      const html2canvas = await loadHtml2Canvas();
      const viewport = readViewportSize();
      const width = Math.max(1, viewport.width);
      const height = Math.max(1, viewport.height);
      const scrollX = Math.round(window.scrollX ?? window.pageXOffset ?? 0);
      const scrollY = Math.round(window.scrollY ?? window.pageYOffset ?? 0);

      const options: Parameters<Html2CanvasFn>[1] = {
        scale: 1,
        useCORS: true,
        logging: false,
        width,
        height,
        windowWidth: width,
        windowHeight: height,
        x: scrollX,
        y: scrollY,
        scrollX,
        scrollY,
        ignoreElements: element =>
          element?.id === AGENT_UI_ID || element?.classList.contains('ghost-agent-ignore'),
      };

      const canvas = await html2canvas(document.body, options);
      const canvasWidth = Math.max(1, Math.round(canvas.width));
      const canvasHeight = Math.max(1, Math.round(canvas.height));
      lastViewportSizeRef.current = { width: canvasWidth, height: canvasHeight };

      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      const [, base64] = dataUrl.split(',');
      if (!base64) {
        return null;
      }

      return {
        base64,
        dataUrl,
        viewport: { width: canvasWidth, height: canvasHeight },
      };
    } catch (error) {
      console.error('Screen capture failed', error);
      addLog('❌ Unable to capture the screen. Please try again.');
      return null;
    }
  }, [addLog, loadHtml2Canvas]);

  const convertCoordinate = useCallback(
    (value: unknown, axis: 'x' | 'y'): number | null => {
      const referenceViewport = lastViewportSizeRef.current;
      const currentViewport = readViewportSize();
      const referenceSize = referenceViewport
        ? axis === 'x'
          ? referenceViewport.width
          : referenceViewport.height
        : axis === 'x'
        ? currentViewport.width
        : currentViewport.height;

      const coordinate = normalizeCoordinate(value, referenceSize);
      if (coordinate === null) {
        return null;
      }

      const currentSize = axis === 'x' ? currentViewport.width : currentViewport.height;
      if (!referenceViewport || referenceSize === currentSize || referenceSize === 0) {
        return clamp(coordinate, 0, currentSize);
      }

      if (currentSize === 0) {
        return clamp(coordinate, 0, referenceSize);
      }

      const scaled = Math.round((coordinate / referenceSize) * currentSize);
      return clamp(scaled, 0, currentSize);
    },
    [],
  );

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
      setIsPayloadPreviewOpen(false);
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
        const maxScrollHeight = Math.max(document.body.scrollHeight, window.innerHeight);
        const maxScrollWidth = Math.max(document.body.scrollWidth, window.innerWidth);
        const targetY = normalizeCoordinate(action.y, maxScrollHeight);
        const targetX = normalizeCoordinate(action.x ?? 0, maxScrollWidth);

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

      const screenX = convertCoordinate(action.x, 'x');
      const screenY = convertCoordinate(action.y, 'y');

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
    [addLog, convertCoordinate, setFeedbackInput, setIsAwaitingFeedback, setPendingQuestion, updateCursor],
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

          const { base64: screenshotBase64, dataUrl: screenshotDataUrl, viewport } = screenshot;
          const historySnapshot = JSON.parse(
            JSON.stringify(historyRef.current),
          ) as GhostAgentHistoryEntry[];
          const payloadSummary: PayloadPreviewData['payloadSummary'] = {
            step: stepCountRef.current + 1,
            objective: trimmedObjective,
            screenWidth: viewport.width,
            screenHeight: viewport.height,
            history: historySnapshot,
            screenshotBase64Length: screenshotBase64.length,
            screenshotBase64Preview:
              screenshotBase64.length > 120
                ? `${screenshotBase64.slice(0, 120)}…`
                : screenshotBase64,
          };

          setPayloadPreview({
            screenshotDataUrl,
            payloadSummary,
          });
          setIsPayloadPreviewOpen(true);

          let action: GhostAgentAction | null = null;
          try {
            action = await requestGhostAgentStep({
              objective: trimmedObjective,
              screenshotBase64: screenshotBase64,
              screenWidth: viewport.width,
              screenHeight: viewport.height,
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

  useEffect(() => {
    if (!isPayloadPreviewOpen || typeof window === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsPayloadPreviewOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPayloadPreviewOpen]);

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
  const calibrationAggregate = useMemo(
    () => deriveCalibrationAggregate(calibrationHistory),
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

      {payloadPreview && isPayloadPreviewOpen ? (
        <PayloadPreviewModal
          preview={payloadPreview}
          onClose={() => setIsPayloadPreviewOpen(false)}
        />
      ) : null}

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
                  {payloadPreview ? (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsPayloadPreviewOpen(true)}
                        className="text-[11px] font-semibold text-indigo-200 transition hover:text-indigo-100"
                      >
                        View last request payload
                      </button>
                    </div>
                  ) : null}
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
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Calibration</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetCalibrationHistory}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={calibrationHistory.length === 0}
                  >
                    Reset data
                  </button>
                  <button
                    type="button"
                    onClick={handleStartCalibration}
                    className="rounded-lg border border-red-400/70 px-3 py-1.5 text-xs font-semibold text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isRunning}
                  >
                    Run calibration check
                  </button>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-slate-300/80">{calibrationStatusText}</p>
              {calibrationAggregate ? (
                <div
                  className={`rounded-lg border px-3 py-2 text-xs leading-relaxed ${
                    calibrationAggregate.severity === 'aligned'
                      ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
                      : calibrationAggregate.severity === 'watch'
                      ? 'border-amber-400/60 bg-amber-500/10 text-amber-100'
                      : 'border-red-400/60 bg-red-500/10 text-red-100'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide">
                    <span>
                      {calibrationAggregate.severity === 'aligned'
                        ? 'Aligned'
                        : calibrationAggregate.severity === 'watch'
                        ? 'Monitor drift'
                        : 'Severe drift'}
                    </span>
                    <span className="text-[10px] font-medium tracking-normal text-white/70">
                      {calibrationAggregate.sampleCount} sample
                      {calibrationAggregate.sampleCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/90">{calibrationAggregate.summary}</p>
                  <p className="mt-1 text-[11px] text-white/80">
                    Mean offset Δx {calibrationAggregate.meanOffset.x}px (|Δx| ≈{' '}
                    {calibrationAggregate.meanAbsoluteOffset.x}px), Δy {calibrationAggregate.meanOffset.y}px (|Δy| ≈{' '}
                    {calibrationAggregate.meanAbsoluteOffset.y}px)
                    {calibrationAggregate.meanDistance !== null
                      ? `, avg distance ${calibrationAggregate.meanDistance}px`
                      : ''}
                    .
                  </p>
                  <p className="mt-1 text-[11px] text-white/70">
                    Success rate {Math.round((1 - calibrationAggregate.failureRate) * 100)}% ({calibrationAggregate.successCount}{' '}
                    success{calibrationAggregate.successCount === 1 ? '' : 'es'}, {calibrationAggregate.failureCount} failure
                    {calibrationAggregate.failureCount === 1 ? '' : 's'}).
                  </p>
                  {calibrationAggregate.transform ? (
                    <div className="mt-2 rounded-md border border-white/20 bg-white/5 px-2.5 py-2 text-[11px] text-white/85">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-white/70">
                        Transform analysis
                      </div>
                      <p className="mt-1 text-xs text-white/90">{calibrationAggregate.transform.summary}</p>
                      {calibrationAggregate.transform.detailLines.length > 0 ? (
                        <ul className="mt-1 space-y-1 text-[11px] text-white/80">
                          {calibrationAggregate.transform.detailLines.map((line, index) => (
                            <li key={`${line}-${index}`} className="list-inside list-disc marker:text-white/50">
                              {line}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                  {calibrationAggregate.recommendation ? (
                    <p className="mt-1 text-[11px] text-white/80">{calibrationAggregate.recommendation}</p>
                  ) : null}
                </div>
              ) : null}
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

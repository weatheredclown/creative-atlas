import type { RequestHandler } from 'express';
import { Logging } from '@google-cloud/logging';

type TelemetrySeverity =
  | 'DEBUG'
  | 'INFO'
  | 'NOTICE'
  | 'WARNING'
  | 'ERROR'
  | 'CRITICAL'
  | 'ALERT'
  | 'EMERGENCY';

interface TrackEventOptions {
  severity?: TelemetrySeverity;
  status?: 'success' | 'error';
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

const parseIntegerEnv = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const sanitizeValue = (value: unknown): unknown => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeValue(item))
      .filter((item) => item !== undefined);
  }
  if (typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      const sanitizedEntry = sanitizeValue(entry);
      if (sanitizedEntry !== undefined) {
        sanitized[key] = sanitizedEntry;
      }
    }
    return sanitized;
  }
  return String(value);
};

class TelemetryClient {
  private readonly logName: string;
  private readonly projectId?: string;
  private readonly loggingEnabled: boolean;
  private readonly log = this.initializeLog();

  constructor() {
    this.loggingEnabled = process.env.ENABLE_GCP_LOGGING === 'true';
    this.projectId = process.env.GCP_PROJECT_ID ?? process.env.GOOGLE_CLOUD_PROJECT;
    this.logName = process.env.OPERATIONS_LOG_NAME ?? 'creative-atlas-operations';
  }

  startOperation(event: string, metadata?: Record<string, unknown>): OperationSpan {
    return new OperationSpan(this, event, metadata ?? {});
  }

  recordEvent(event: string, metadata?: Record<string, unknown>, severity: TelemetrySeverity = 'INFO'): void {
    this.trackEvent(event, { metadata, severity });
  }

  recordComplianceViolation(details: {
    violation: string;
    message: string;
    metadata?: Record<string, unknown>;
  }): void {
    this.trackEvent('compliance.violation', {
      severity: 'WARNING',
      status: 'error',
      metadata: {
        violation: details.violation,
        message: details.message,
        ...details.metadata,
      },
    });
  }

  trackEvent(event: string, options: TrackEventOptions = {}): void {
    const { severity = 'INFO', status, durationMs, metadata } = options;
    const payload = {
      event,
      status,
      severity,
      durationMs,
      metadata: this.sanitizeMetadata(metadata),
      environment: process.env.NODE_ENV ?? 'development',
      timestamp: new Date().toISOString(),
    };

    if (this.log) {
      const entry = this.log.entry(
        {
          resource: this.projectId
            ? { type: 'global', labels: { project_id: this.projectId } }
            : { type: 'global' },
          severity,
        },
        payload,
      );

      this.log
        .write(entry)
        .catch((error) => console.error('Failed to publish telemetry event', error));
      return;
    }

    const logger = this.selectConsole(severity);
    logger(`[telemetry] ${event}`, payload);
  }

  serializeError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    if (typeof error === 'string') {
      return { message: error };
    }

    return (sanitizeValue(error) as Record<string, unknown>) ?? { message: String(error) };
  }

  private initializeLog() {
    if (!this.loggingEnabled || !this.projectId) {
      return null;
    }

    try {
      const logging = new Logging({ projectId: this.projectId });
      return logging.log(this.logName);
    } catch (error) {
      console.warn('Failed to initialize Cloud Logging client; falling back to console logging.', error);
      return null;
    }
  }

  private sanitizeMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    if (!metadata) {
      return undefined;
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata)) {
      const sanitizedValue = sanitizeValue(value);
      if (sanitizedValue !== undefined) {
        sanitized[key] = sanitizedValue;
      }
    }
    return sanitized;
  }

  private selectConsole(severity: TelemetrySeverity): typeof console.log {
    if (severity === 'ERROR' || severity === 'CRITICAL' || severity === 'ALERT' || severity === 'EMERGENCY') {
      return console.error;
    }
    if (severity === 'WARNING' || severity === 'NOTICE') {
      return console.warn;
    }
    return console.info;
  }
}

class OperationSpan {
  private readonly start = process.hrtime.bigint();
  private finished = false;

  constructor(
    private readonly client: TelemetryClient,
    private readonly event: string,
    private readonly baseMetadata: Record<string, unknown>,
  ) {}

  getDurationMs(): number {
    const diff = Number(process.hrtime.bigint() - this.start) / 1_000_000;
    return Math.round(diff * 1000) / 1000;
  }

  success(metadata?: Record<string, unknown>, severity: TelemetrySeverity = 'INFO'): void {
    if (this.finished) {
      return;
    }
    this.finished = true;
    this.client.trackEvent(this.event, {
      severity,
      status: 'success',
      durationMs: this.getDurationMs(),
      metadata: this.mergeMetadata(metadata),
    });
  }

  fail(error: unknown, metadata?: Record<string, unknown>, severity: TelemetrySeverity = 'ERROR'): void {
    if (this.finished) {
      return;
    }
    this.finished = true;
    this.client.trackEvent(this.event, {
      severity,
      status: 'error',
      durationMs: this.getDurationMs(),
      metadata: this.mergeMetadata({ ...metadata, error: this.client.serializeError(error) }),
    });
  }

  private mergeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> {
    return {
      ...this.baseMetadata,
      ...(metadata ?? {}),
    };
  }
}

export const telemetry = new TelemetryClient();

const slowRequestThresholdMs = parseIntegerEnv(process.env.REQUEST_WARNING_THRESHOLD_MS, 2000);

export const requestMetricsMiddleware: RequestHandler = (req, res, next) => {
  if (req.path === '/health') {
    next();
    return;
  }

  const requestId = req.get('x-request-id') ?? undefined;
  const operation = telemetry.startOperation('http.request', {
    method: req.method,
    path: req.originalUrl ?? req.path,
    requestId,
  });

  let completed = false;

  res.on('finish', () => {
    completed = true;
    const durationMs = operation.getDurationMs();
    const severity: TelemetrySeverity =
      res.statusCode >= 500
        ? 'ERROR'
        : res.statusCode >= 400 || durationMs > slowRequestThresholdMs
          ? 'WARNING'
          : 'INFO';

    operation.success(
      {
        statusCode: res.statusCode,
        route: req.route?.path ?? req.originalUrl ?? req.path,
        durationMs,
      },
      severity,
    );
  });

  res.on('close', () => {
    if (completed) {
      return;
    }
    operation.fail(
      new Error('Client aborted request'),
      {
        statusCode: res.statusCode,
        route: req.route?.path ?? req.originalUrl ?? req.path,
      },
      'WARNING',
    );
  });

  next();
};


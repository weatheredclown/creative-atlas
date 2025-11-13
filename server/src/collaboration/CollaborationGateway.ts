import { EventEmitter } from 'node:events';

export type CollaborationTransportEvent =
  | { type: 'session:created'; sessionId: string; artifactId: string; version: number }
  | { type: 'session:closed'; sessionId: string }
  | { type: 'presence:updated'; sessionId: string; participantId: string; cursors: PresenceCursor[] }
  | {
      type: 'patch:applied';
      sessionId: string;
      participantId: string;
      operations: CollaborationOperation[];
      version: number;
    };

export interface PresenceCursor {
  artifactId: string;
  blockId: string | null;
  offset: number | null;
}

export interface CollaborationOperation {
  kind: 'insert' | 'remove' | 'replace';
  path: string;
  value?: unknown;
  previousValue?: unknown;
}

export interface CollaborationSnapshot<TDocument> {
  document: TDocument;
  version: number;
}

export interface CollaborationSession<TDocument> {
  id: string;
  artifactId: string;
  version: number;
  state: TDocument;
}

export interface CollaborationAdapter<TDocument> {
  loadDocument: (artifactId: string) => Promise<CollaborationSnapshot<TDocument>>;
  applyOperations: (
    snapshot: CollaborationSnapshot<TDocument>,
    operations: CollaborationOperation[],
  ) => CollaborationSnapshot<TDocument>;
}

export interface UpsertPresenceParams {
  sessionId: string;
  participantId: string;
  cursors: PresenceCursor[];
}

export interface ApplyPatchParams {
  sessionId: string;
  participantId: string;
  operations: CollaborationOperation[];
}

export interface CollaborationGatewayOptions<TDocument> {
  adapter: CollaborationAdapter<TDocument>;
  idleTimeoutMs?: number;
}

const DEFAULT_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

export class CollaborationGateway<TDocument> extends EventEmitter {
  private readonly sessions = new Map<string, CollaborationSession<TDocument>>();
  private readonly idleTimers = new Map<string, NodeJS.Timeout>();
  private readonly adapter: CollaborationAdapter<TDocument>;
  private readonly idleTimeoutMs: number;

  constructor({ adapter, idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS }: CollaborationGatewayOptions<TDocument>) {
    super();
    this.adapter = adapter;
    this.idleTimeoutMs = idleTimeoutMs;
  }

  async joinSession(sessionId: string, artifactId: string): Promise<CollaborationSession<TDocument>> {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      this.resetIdleTimer(sessionId);
      return existing;
    }

    const snapshot = await this.adapter.loadDocument(artifactId);
    const session: CollaborationSession<TDocument> = {
      id: sessionId,
      artifactId,
      version: snapshot.version,
      state: snapshot.document,
    };

    this.sessions.set(sessionId, session);
    this.resetIdleTimer(sessionId);
    this.emit('event', {
      type: 'session:created',
      sessionId,
      artifactId,
      version: session.version,
    } satisfies CollaborationTransportEvent);
    return session;
  }

  upsertPresence({ sessionId, participantId, cursors }: UpsertPresenceParams): void {
    if (!this.sessions.has(sessionId)) {
      throw new Error(`Collaboration session ${sessionId} is not active.`);
    }

    this.resetIdleTimer(sessionId);
    this.emit('event', {
      type: 'presence:updated',
      sessionId,
      participantId,
      cursors,
    } satisfies CollaborationTransportEvent);
  }

  async applyPatch({ sessionId, participantId, operations }: ApplyPatchParams): Promise<CollaborationSession<TDocument>> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Collaboration session ${sessionId} is not active.`);
    }

    const snapshot: CollaborationSnapshot<TDocument> = {
      document: session.state,
      version: session.version,
    };

    const nextSnapshot = this.adapter.applyOperations(snapshot, operations);
    const nextSession: CollaborationSession<TDocument> = {
      ...session,
      state: nextSnapshot.document,
      version: nextSnapshot.version,
    };

    this.sessions.set(sessionId, nextSession);

    this.resetIdleTimer(sessionId);
    this.emit('event', {
      type: 'patch:applied',
      sessionId,
      participantId,
      operations,
      version: nextSession.version,
    } satisfies CollaborationTransportEvent);

    return nextSession;
  }

  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    this.sessions.delete(sessionId);
    const idleTimer = this.idleTimers.get(sessionId);
    if (idleTimer) {
      clearTimeout(idleTimer);
      this.idleTimers.delete(sessionId);
    }

    this.emit('event', { type: 'session:closed', sessionId } satisfies CollaborationTransportEvent);
  }

  private resetIdleTimer(sessionId: string): void {
    const previousTimer = this.idleTimers.get(sessionId);
    if (previousTimer) {
      clearTimeout(previousTimer);
    }

    const timeout = setTimeout(() => {
      this.closeSession(sessionId);
    }, this.idleTimeoutMs);

    this.idleTimers.set(sessionId, timeout);
  }
}

export type CollaborationEventListener = (event: CollaborationTransportEvent) => void;

export const registerGatewayListener = <TDocument>(
  gateway: CollaborationGateway<TDocument>,
  listener: CollaborationEventListener,
): (() => void) => {
  const handler = (event: CollaborationTransportEvent) => listener(event);
  gateway.on('event', handler);
  return () => gateway.off('event', handler);
};

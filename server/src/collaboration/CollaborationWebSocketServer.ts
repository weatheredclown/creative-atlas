import { WebSocketServer, WebSocket, type RawData } from 'ws';
import type { Server as HttpServer } from 'node:http';

import type {
  ApplyPatchParams,
  CollaborationGateway,
  CollaborationOperation,
  CollaborationTransportEvent,
  PresenceCursor,
} from './CollaborationGateway.js';
import { registerGatewayListener } from './CollaborationGateway.js';

export interface CollaborationWebSocketServerOptions<TDocument> {
  server: HttpServer;
  gateway: CollaborationGateway<TDocument>;
  path?: string;
}

type CollaborationClientMessage =
  | {
      type: 'session:join';
      sessionId: string;
      artifactId: string;
      participantId: string;
    }
  | {
      type: 'presence:update';
      cursors: PresenceCursor[];
    }
  | {
      type: 'patch:apply';
      operations: CollaborationOperation[];
    };

type CollaborationServerMessage<TDocument> =
  | {
      type: 'session:joined';
      sessionId: string;
      artifactId: string;
      participantId: string;
      document: TDocument;
      version: number;
    }
  | {
      type: 'session:closed';
      sessionId: string;
    }
  | CollaborationTransportEvent
  | {
      type: 'patch:acknowledged';
      sessionId: string;
      version: number;
    }
  | {
    type: 'error';
    message: string;
  };

interface ConnectedClient {
  sessionId: string;
  participantId: string;
}

export class CollaborationWebSocketServer<TDocument> {
  private readonly wss: WebSocketServer;

  private readonly gateway: CollaborationGateway<TDocument>;

  private readonly clients = new Map<WebSocket, ConnectedClient>();

  private readonly sessions = new Map<string, Set<WebSocket>>();

  private readonly unsubscribe: () => void;

  constructor({ server, gateway, path = '/collaboration' }: CollaborationWebSocketServerOptions<TDocument>) {
    this.gateway = gateway;
    this.wss = new WebSocketServer({ server, path });
    this.wss.on('connection', (socket) => {
      this.attachConnectionHandlers(socket);
    });

    this.unsubscribe = registerGatewayListener(this.gateway, (event) => {
      this.broadcastGatewayEvent(event);
    });

    this.wss.on('close', () => {
      this.unsubscribe();
      this.clients.clear();
      this.sessions.clear();
    });
  }

  private attachConnectionHandlers(socket: WebSocket): void {
    socket.on('message', async (rawMessage: RawData) => {
      await this.handleClientMessage(socket, rawMessage);
    });

    socket.on('close', () => {
      this.handleClientDisconnect(socket);
    });

    socket.on('error', (error) => {
      console.error('Collaboration WebSocket error', error);
      socket.close();
    });
  }

  private async handleClientMessage(socket: WebSocket, rawMessage: RawData): Promise<void> {
    let parsed: CollaborationClientMessage;

    try {
      parsed = JSON.parse(rawMessage.toString()) as CollaborationClientMessage;
    } catch (error) {
      this.send(socket, { type: 'error', message: 'Invalid message format.' });
      return;
    }

    switch (parsed.type) {
      case 'session:join':
        await this.handleSessionJoin(socket, parsed);
        break;
      case 'presence:update':
        this.handlePresenceUpdate(socket, parsed);
        break;
      case 'patch:apply':
        await this.handlePatchApply(socket, parsed);
        break;
      default:
        this.send(socket, { type: 'error', message: `Unknown message type: ${(parsed as any).type}` });
    }
  }

  private async handleSessionJoin(socket: WebSocket, message: Extract<CollaborationClientMessage, { type: 'session:join' }>): Promise<void> {
    const { sessionId, artifactId, participantId } = message;

    if (!sessionId || !artifactId || !participantId) {
      this.send(socket, { type: 'error', message: 'sessionId, artifactId, and participantId are required.' });
      return;
    }

    try {
      const session = await this.gateway.joinSession(sessionId, artifactId);
      this.clients.set(socket, { sessionId, participantId });
      this.addSocketToSession(socket, sessionId);
      this.send(socket, {
        type: 'session:joined',
        sessionId,
        artifactId,
        participantId,
        document: session.state,
        version: session.version,
      });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Failed to join collaboration session.';
      this.send(socket, { type: 'error', message: messageText });
    }
  }

  private handlePresenceUpdate(
    socket: WebSocket,
    message: Extract<CollaborationClientMessage, { type: 'presence:update' }>,
  ): void {
    const metadata = this.clients.get(socket);
    if (!metadata) {
      this.send(socket, { type: 'error', message: 'Join a session before sending presence updates.' });
      return;
    }

    if (!Array.isArray(message.cursors)) {
      this.send(socket, { type: 'error', message: 'Presence updates must include a cursors array.' });
      return;
    }

    try {
      this.gateway.upsertPresence({
        sessionId: metadata.sessionId,
        participantId: metadata.participantId,
        cursors: message.cursors,
      });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Failed to update presence.';
      this.send(socket, { type: 'error', message: messageText });
    }
  }

  private async handlePatchApply(
    socket: WebSocket,
    message: Extract<CollaborationClientMessage, { type: 'patch:apply' }>,
  ): Promise<void> {
    const metadata = this.clients.get(socket);
    if (!metadata) {
      this.send(socket, { type: 'error', message: 'Join a session before applying patches.' });
      return;
    }

    if (!Array.isArray(message.operations)) {
      this.send(socket, { type: 'error', message: 'Patch application requires an operations array.' });
      return;
    }

    const params: ApplyPatchParams = {
      sessionId: metadata.sessionId,
      participantId: metadata.participantId,
      operations: message.operations,
    };

    try {
      const session = await this.gateway.applyPatch(params);
      this.send(socket, {
        type: 'patch:acknowledged',
        sessionId: metadata.sessionId,
        version: session.version,
      });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Failed to apply patch.';
      this.send(socket, { type: 'error', message: messageText });
    }
  }

  private broadcastGatewayEvent(event: CollaborationTransportEvent): void {
    switch (event.type) {
      case 'session:created':
      case 'session:closed':
        this.broadcastToSession(event.sessionId, event);
        if (event.type === 'session:closed') {
          this.sessions.delete(event.sessionId);
        }
        break;
      case 'presence:updated':
      case 'patch:applied':
        this.broadcastToSession(event.sessionId, event);
        break;
      default:
        break;
    }
  }

  private addSocketToSession(socket: WebSocket, sessionId: string): void {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, new Set());
    }
    this.sessions.get(sessionId)?.add(socket);
  }

  private handleClientDisconnect(socket: WebSocket): void {
    const metadata = this.clients.get(socket);
    if (!metadata) {
      return;
    }

    this.clients.delete(socket);
    const sessionSockets = this.sessions.get(metadata.sessionId);
    if (sessionSockets) {
      sessionSockets.delete(socket);
      if (sessionSockets.size === 0) {
        this.sessions.delete(metadata.sessionId);
        this.gateway.closeSession(metadata.sessionId);
      }
    }
  }

  private broadcastToSession(sessionId: string, message: CollaborationServerMessage<TDocument>): void {
    const sockets = this.sessions.get(sessionId);
    if (!sockets) {
      return;
    }

    for (const socket of sockets) {
      this.send(socket, message);
    }
  }

  private send(socket: WebSocket, message: CollaborationServerMessage<TDocument>): void {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      socket.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send collaboration event', error);
    }
  }
}


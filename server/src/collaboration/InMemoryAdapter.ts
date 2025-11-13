import type {
  CollaborationAdapter,
  CollaborationOperation,
  CollaborationSnapshot,
} from './CollaborationGateway.js';

export interface InMemoryAdapterOptions<TDocument> {
  initialState?: TDocument;
}

export class InMemoryAdapter<TDocument extends Record<string, unknown> | unknown[]> implements CollaborationAdapter<TDocument> {
  private readonly stateByArtifact = new Map<string, CollaborationSnapshot<TDocument>>();
  private readonly initialState: TDocument;

  constructor({ initialState }: InMemoryAdapterOptions<TDocument> = {}) {
    this.initialState = initialState ?? ({} as TDocument);
  }

  async loadDocument(artifactId: string): Promise<CollaborationSnapshot<TDocument>> {
    const existing = this.stateByArtifact.get(artifactId);
    if (existing) {
      return existing;
    }

    const snapshot: CollaborationSnapshot<TDocument> = {
      document: this.cloneDocument(this.initialState),
      version: 0,
    };

    this.stateByArtifact.set(artifactId, snapshot);
    return snapshot;
  }

  applyOperations(
    snapshot: CollaborationSnapshot<TDocument>,
    operations: CollaborationOperation[],
  ): CollaborationSnapshot<TDocument> {
    let nextDocument = snapshot.document;

    for (const operation of operations) {
      if (operation.kind === 'replace' && typeof nextDocument === 'object' && nextDocument !== null) {
        nextDocument = this.applyReplaceOperation(nextDocument, operation);
        continue;
      }

      if (operation.kind === 'insert' || operation.kind === 'remove') {
        console.warn('Operation kind not yet supported by in-memory adapter', operation.kind);
      }
    }

    const nextSnapshot: CollaborationSnapshot<TDocument> = {
      document: nextDocument,
      version: snapshot.version + 1,
    };

    return nextSnapshot;
  }

  private applyReplaceOperation(document: TDocument, operation: CollaborationOperation): TDocument {
    if (!operation.path.startsWith('/')) {
      return document;
    }

    const segments = operation.path
      .split('/')
      .filter((segment) => segment.length > 0)
      .map((segment) => decodeURIComponent(segment));

    if (segments.length === 0) {
      return operation.value as TDocument;
    }

    const cloned = this.cloneDocument(document);
    let cursor: any = cloned;

    for (let index = 0; index < segments.length - 1; index += 1) {
      const segment = segments[index];
      if (!(segment in cursor)) {
        cursor[segment] = {};
      }
      cursor = cursor[segment];
    }

    cursor[segments[segments.length - 1]] = operation.value;
    return cloned;
  }

  private cloneDocument(document: TDocument): TDocument {
    if (Array.isArray(document)) {
      return [...document] as TDocument;
    }

    if (document && typeof document === 'object') {
      return { ...document } as TDocument;
    }

    return document;
  }
}

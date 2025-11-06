export type Job<T> = () => Promise<T>;

interface FireAndForgetQueueItem {
  run: () => Promise<void>;
}

export interface FireAndForgetQueue {
  addJob: <T>(job: Job<T>) => Promise<T>;
}

/**
 * Creates a self-contained queue that immediately processes jobs.
 * This matches the original "fire and forget" behaviour that the publish
 * endpoint depends on.
 */
export const createFireAndForgetQueue = (): FireAndForgetQueue => {
  const queue: FireAndForgetQueueItem[] = [];
  let isProcessing = false;

  const processQueue = async (): Promise<void> => {
    if (isProcessing) {
      return;
    }

    isProcessing = true;

    try {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) {
          continue;
        }

        try {
          await next.run();
        } catch (error) {
          // Individual queue items are responsible for rejecting their own promises.
          // Swallowing any unexpected errors keeps the queue progressing.
          console.error('Unhandled queue error', error);
        }
      }
    } finally {
      isProcessing = false;
    }
  };

  const addJob = <T>(job: Job<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      queue.push({
        run: async () => {
          try {
            const result = await job();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        },
      });
      void processQueue();
    });
  };

  return { addJob };
};

export interface OrchestratedQueueItem {
  id: string;
  label?: string;
  job: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}

export interface OrchestratedQueue {
  addJob: <T>(job: Job<T>, metadata?: { id?: string; label?: string }) => Promise<T>;
  cancelJob: (id: string, reason?: unknown) => boolean;
  getQueue: () => readonly OrchestratedQueueItem[];
  isProcessing: () => boolean;
  processQueue: () => Promise<void>;
}

interface OrchestratedQueueOptions {
  idPrefix?: string;
  createId?: () => string;
}

/**
 * Creates a queue where orchestration (starting, cancelling, ordering) is handled
 * externally – perfect for UI driven flows that need to visualise or cancel jobs.
 */
export const createOrchestratedQueue = (
  options: OrchestratedQueueOptions = {},
): OrchestratedQueue => {
  const queue: OrchestratedQueueItem[] = [];
  const { idPrefix = 'job-', createId } = options;
  let counter = 0;
  let processing = false;

  const nextId = (): string => {
    if (createId) {
      return createId();
    }
    const id = `${idPrefix}${counter}`;
    counter += 1;
    return id;
  };

  const addJob = <T>(job: Job<T>, metadata: { id?: string; label?: string } = {}): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const id = metadata.id ?? nextId();
      const label = metadata.label;

      queue.push({
        id,
        label,
        job: async () => job(),
        resolve: (value: unknown) => {
          resolve(value as T);
        },
        reject,
      });
    });
  };

  const cancelJob = (id: string, reason: unknown = new Error(`Job "${id}" was cancelled.`)): boolean => {
    const index = queue.findIndex((item) => item.id === id);
    if (index === -1) {
      return false;
    }

    const [item] = queue.splice(index, 1);
    item.reject(reason);
    return true;
  };

  const processQueue = async (): Promise<void> => {
    if (processing) {
      return;
    }

    processing = true;

    try {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) {
          continue;
        }

        try {
          const result = await item.job();
          item.resolve(result);
        } catch (error) {
          item.reject(error);
        }
      }
    } finally {
      processing = false;
    }
  };

  const getQueue = (): readonly OrchestratedQueueItem[] => queue.slice();

  const isProcessing = (): boolean => processing;

  return {
    addJob,
    cancelJob,
    getQueue,
    isProcessing,
    processQueue,
  };
};

// Preserve the original singleton queue used by the GitHub publish flow.
const defaultQueue = createFireAndForgetQueue();

export const addJob = defaultQueue.addJob;

type Job<T> = () => Promise<T>;

interface QueueItem {
  run: () => Promise<void>;
}

const queue: QueueItem[] = [];
let isProcessing = false;

const processQueue = async (): Promise<void> => {
  if (isProcessing) {
    return;
  }

  isProcessing = true;

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

  isProcessing = false;
};

export const addJob = <T>(job: Job<T>): Promise<T> => {
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

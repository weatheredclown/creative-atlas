type Job<T> = () => Promise<T>;

interface QueueItem {
  job: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
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
      const result = await next.job();
      next.resolve(result);
    } catch (error) {
      next.reject(error);
    }
  }

  isProcessing = false;
};

export const addJob = <T>(job: Job<T>): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    queue.push({
      job: async () => job(),
      resolve: (value: unknown) => {
        resolve(value as T);
      },
      reject,
    });
    void processQueue();
  });
};

type Job<T> = () => Promise<T>;

interface QueueItem<T> {
  job: Job<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

const queue: QueueItem<unknown>[] = [];
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
    queue.push({ job, resolve, reject });
    void processQueue();
  });
};

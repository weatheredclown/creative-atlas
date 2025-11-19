import type { Firestore, Transaction } from 'firebase-admin/firestore';

export interface TransactionRetryOptions {
  /**
   * Maximum number of attempts (initial try + retries) before surfacing the error.
   */
  maxAttempts?: number;
  /**
   * Base delay (ms) used for exponential backoff jitter between retries.
   */
  initialDelayMs?: number;
}

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_INITIAL_DELAY_MS = 50;
const FIRESTORE_ABORTED_CODE = 10;

const wait = (ms: number): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const isAbortError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const candidate = error as { code?: number; message?: string; details?: string };
  if (candidate.code === FIRESTORE_ABORTED_CODE) {
    return true;
  }
  const message = candidate.message ?? candidate.details;
  if (typeof message === 'string') {
    return message.includes('10 ABORTED') || message.includes('cross-transaction contention');
  }
  return false;
};

export const runTransactionWithRetry = async <T>(
  db: Firestore,
  updater: (transaction: Transaction) => Promise<T>,
  options: TransactionRetryOptions = {},
): Promise<T> => {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const initialDelayMs = options.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await db.runTransaction(updater);
    } catch (error) {
      attempt += 1;
      if (!isAbortError(error) || attempt >= maxAttempts) {
        throw error;
      }

      const jitter = Math.random();
      const delay = initialDelayMs * (2 ** (attempt - 1));
      await wait(delay + jitter * initialDelayMs);
    }
  }
};

export default runTransactionWithRetry;

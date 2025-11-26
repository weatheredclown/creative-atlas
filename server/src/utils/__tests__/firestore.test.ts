import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { runTransactionWithRetry } from '../firestore.js';

const createFirestore = (impl: (handler: (tx: Transaction) => Promise<unknown>) => Promise<unknown>) => {
  const runTransaction = vi.fn(impl);
  return {
    firestore: { runTransaction } as unknown as Firestore,
    runTransaction,
  };
};

describe('runTransactionWithRetry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('succeeds on the first attempt', async () => {
    const transaction = {} as Transaction;
    const handler = vi.fn(async () => 'result');
    const { firestore, runTransaction } = createFirestore(async (fn) => fn(transaction));

    const result = await runTransactionWithRetry(firestore, handler);

    expect(result).toBe('result');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(runTransaction).toHaveBeenCalledTimes(1);
  });

  it('retries aborted transactions before succeeding', async () => {
    const transaction = {} as Transaction;
    const handler = vi.fn(async () => 'ok');
    const abortedError = Object.assign(new Error('10 ABORTED: cross-transaction contention'), { code: 10 });
    const runTransaction = vi
      .fn<(fn: (tx: Transaction) => Promise<unknown>) => Promise<unknown>>()
      .mockImplementationOnce(async () => {
        throw abortedError;
      })
      .mockImplementationOnce(async (fn) => fn(transaction));

    const firestore = { runTransaction } as unknown as Firestore;

    const result = await runTransactionWithRetry(firestore, handler, { maxAttempts: 3, initialDelayMs: 1 });

    expect(result).toBe('ok');
    expect(runTransaction).toHaveBeenCalledTimes(2);
  });

  it('stops retrying once the max attempts are exhausted', async () => {
    const abortedError = Object.assign(new Error('10 ABORTED: contention'), { code: 10 });
    const runTransaction = vi.fn(async () => {
      throw abortedError;
    });
    const firestore = { runTransaction } as unknown as Firestore;

    await expect(
      runTransactionWithRetry(firestore, async () => 'never', { maxAttempts: 2, initialDelayMs: 1 }),
    ).rejects.toBe(abortedError);
    expect(runTransaction).toHaveBeenCalledTimes(2);
  });

  it('does not retry on non-aborted errors', async () => {
    const nonRetryable = new Error('permission denied');
    const runTransaction = vi.fn(async () => {
      throw nonRetryable;
    });
    const firestore = { runTransaction } as unknown as Firestore;

    await expect(runTransactionWithRetry(firestore, async () => 'never')).rejects.toBe(nonRetryable);
    expect(runTransaction).toHaveBeenCalledTimes(1);
  });
});

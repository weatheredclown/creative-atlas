import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enforceNanoBananaUsageLimits, NanoBananaLimitError } from '../nanoBananaUsage.js';

const { mockDocStore, mockTransaction, mockCollection, runTransaction, mockRunTransactionWithRetry } = vi.hoisted(() => {
  const store: Record<string, Record<string, unknown>> = {};
  const transaction = {
    get: vi.fn(async (docRef: { id: string }) => {
      const doc = store[docRef.id];
      if (!doc) {
        return {
          exists: false,
          data: () => undefined,
        };
      }
      return {
        exists: true,
        data: () => doc,
      };
    }),
    set: vi.fn(
      (docRef: { id: string }, data: Record<string, unknown>, options?: { merge?: boolean }) => {
        const base = options?.merge ? store[docRef.id] ?? {} : {};
        store[docRef.id] = { ...base, ...data };
        return store[docRef.id];
      },
    ),
  };

  const collection = vi.fn(() => ({
    doc: vi.fn((id: string) => ({ id })),
  }));

  const run = vi.fn(async (handler: (tx: typeof transaction) => Promise<unknown>) => handler(transaction));

  const runWithRetry = vi.fn(
    async (
      _firestore: unknown,
      handler: (tx: typeof transaction) => Promise<unknown>,
    ) => handler(transaction),
  );

  return {
    mockDocStore: store,
    mockTransaction: transaction,
    mockCollection: collection,
    runTransaction: run,
    mockRunTransactionWithRetry: runWithRetry,
  };
});

vi.mock('../../firebaseAdmin.js', () => ({
  firestore: {
    collection: mockCollection,
    runTransaction,
  },
}));

vi.mock('../firestore.js', () => ({
  runTransactionWithRetry: mockRunTransactionWithRetry,
}));

describe('enforceNanoBananaUsageLimits', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-02-20T12:00:00Z'));
    Object.keys(mockDocStore).forEach((key) => delete mockDocStore[key]);
    mockTransaction.get.mockClear();
    mockTransaction.set.mockClear();
    mockCollection.mockClear();
    runTransaction.mockClear();
    mockRunTransactionWithRetry.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('increments usage counters for a user', async () => {
    const result = await enforceNanoBananaUsageLimits({ userId: 'user-1' });
    expect(result.userCount).toBe(1);
    expect(mockTransaction.set).toHaveBeenCalledTimes(1);
    const stored = mockDocStore['user-1'];
    expect(stored?.userCount).toBe(1);
  });

  it('resets counters on the next day', async () => {
    await enforceNanoBananaUsageLimits({ userId: 'user-2' });
    vi.setSystemTime(new Date('2025-02-21T01:00:00Z'));
    const result = await enforceNanoBananaUsageLimits({ userId: 'user-2' });
    expect(result.userCount).toBe(1);
  });

  it('throws when exceeding the per-user limit', async () => {
    await enforceNanoBananaUsageLimits({ userId: 'user-3', perUserLimit: 1 });
    await expect(enforceNanoBananaUsageLimits({ userId: 'user-3', perUserLimit: 1 })).rejects.toBeInstanceOf(
      NanoBananaLimitError,
    );
  });
});

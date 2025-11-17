import { FieldValue } from 'firebase-admin/firestore';
import { firestore } from '../firebaseAdmin.js';

const NANO_BANANA_USAGE_COLLECTION = 'nanoBananaUsage';

const toDailyKey = (inputDate: Date = new Date()): string => inputDate.toISOString().slice(0, 10);

type NanoBananaUsageDoc = {
  ownerId?: string;
  userDate?: string;
  userCount?: number;
};

export class NanoBananaLimitError extends Error {
  scope: 'user';
  limit: number;

  constructor(scope: 'user', limit: number) {
    const message = 'You have reached the daily Nano Banana generation limit for your account.';
    super(message);
    this.name = 'NanoBananaLimitError';
    this.scope = scope;
    this.limit = limit;
  }
}

export interface EnforceNanoBananaUsageOptions {
  userId: string;
  perUserLimit?: number;
}

export interface EnforceNanoBananaUsageResult {
  date: string;
  userCount: number;
}

export const enforceNanoBananaUsageLimits = async (
  options: EnforceNanoBananaUsageOptions,
): Promise<EnforceNanoBananaUsageResult> => {
  const { userId, perUserLimit = 50 } = options;
  const today = toDailyKey();
  const docRef = firestore.collection(NANO_BANANA_USAGE_COLLECTION).doc(userId);

  return firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef);
    const data = (snapshot.exists ? snapshot.data() : {}) as NanoBananaUsageDoc;

    const storedUserDate = data.userDate === today ? data.userDate : today;
    const previousUserCount = data.userDate === today && typeof data.userCount === 'number'
      ? data.userCount
      : 0;

    if (previousUserCount >= perUserLimit) {
      throw new NanoBananaLimitError('user', perUserLimit);
    }

    const updatedUserCount = previousUserCount + 1;

    transaction.set(
      docRef,
      {
        ownerId: userId,
        userDate: storedUserDate,
        userCount: updatedUserCount,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { date: today, userCount: updatedUserCount };
  });
};

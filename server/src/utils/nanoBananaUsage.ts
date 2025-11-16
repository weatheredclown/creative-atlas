import { FieldValue } from 'firebase-admin/firestore';
import { firestore } from '../firebaseAdmin.js';

const NANO_BANANA_USAGE_COLLECTION = 'nanoBananaUsage';

const toDailyKey = (inputDate: Date = new Date()): string => inputDate.toISOString().slice(0, 10);

type ProjectUsageRecord = { date: string; count: number };

type NanoBananaUsageDoc = {
  ownerId?: string;
  userDate?: string;
  userCount?: number;
  projects?: Record<string, ProjectUsageRecord>;
};

export class NanoBananaLimitError extends Error {
  scope: 'user' | 'project';
  limit: number;

  constructor(scope: 'user' | 'project', limit: number) {
    const message =
      scope === 'user'
        ? 'You have reached the daily Nano Banana generation limit for your account.'
        : 'This project has reached its daily Nano Banana regeneration limit.';
    super(message);
    this.name = 'NanoBananaLimitError';
    this.scope = scope;
    this.limit = limit;
  }
}

const normalizeProjectMap = (
  raw: NanoBananaUsageDoc['projects'],
  today: string,
): Record<string, ProjectUsageRecord> => {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const normalized: Record<string, ProjectUsageRecord> = {};
  for (const [projectId, value] of Object.entries(raw)) {
    if (!value || typeof value !== 'object') {
      continue;
    }
    if (value.date === today) {
      normalized[projectId] = {
        date: value.date,
        count: typeof value.count === 'number' && Number.isFinite(value.count) ? value.count : 0,
      };
    }
  }
  return normalized;
};

export interface EnforceNanoBananaUsageOptions {
  userId: string;
  projectId: string;
  perUserLimit?: number;
  perProjectLimit?: number;
}

export interface EnforceNanoBananaUsageResult {
  date: string;
  userCount: number;
  projectCount: number;
}

export const enforceNanoBananaUsageLimits = async (
  options: EnforceNanoBananaUsageOptions,
): Promise<EnforceNanoBananaUsageResult> => {
  const { userId, projectId, perUserLimit = 20, perProjectLimit = 9 } = options;
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

    const projectMap = normalizeProjectMap(data.projects, today);
    const existingProjectUsage = projectMap[projectId];
    const previousProjectCount = existingProjectUsage ? existingProjectUsage.count : 0;

    if (previousProjectCount >= perProjectLimit) {
      throw new NanoBananaLimitError('project', perProjectLimit);
    }

    const updatedUserCount = previousUserCount + 1;
    const updatedProjectCount = previousProjectCount + 1;

    projectMap[projectId] = { date: today, count: updatedProjectCount };

    transaction.set(
      docRef,
      {
        ownerId: userId,
        userDate: storedUserDate,
        userCount: updatedUserCount,
        projects: projectMap,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { date: today, userCount: updatedUserCount, projectCount: updatedProjectCount };
  });
};

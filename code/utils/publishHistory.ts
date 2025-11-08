export interface ProjectPublishRecord {
  repository: string;
  publishDirectory: string;
  pagesUrl: string;
  publishedAt: string;
}

const STORAGE_KEY = 'creative-atlas:last-publish-records';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isProjectPublishRecord = (value: unknown): value is ProjectPublishRecord => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.repository === 'string' &&
    typeof value.publishDirectory === 'string' &&
    typeof value.pagesUrl === 'string' &&
    typeof value.publishedAt === 'string'
  );
};

export const loadProjectPublishHistory = (): Record<string, ProjectPublishRecord> => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<Record<string, ProjectPublishRecord>>(
      (accumulator, [projectId, value]) => {
        if (typeof projectId === 'string' && isProjectPublishRecord(value)) {
          accumulator[projectId] = value;
        }
        return accumulator;
      },
      {},
    );
  } catch (error) {
    console.warn('Failed to load GitHub publish history.', error);
    return {};
  }
};

export const persistProjectPublishHistory = (
  history: Record<string, ProjectPublishRecord>,
): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const sanitized = Object.entries(history).reduce<Record<string, ProjectPublishRecord>>(
      (accumulator, [projectId, record]) => {
        if (typeof projectId === 'string' && isProjectPublishRecord(record)) {
          accumulator[projectId] = record;
        }
        return accumulator;
      },
      {},
    );

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch (error) {
    console.warn('Failed to persist GitHub publish history.', error);
  }
};

import { Router } from 'express';
import type { Response } from 'express';
import { Buffer } from 'node:buffer';
import { FieldPath, FieldValue } from 'firebase-admin/firestore';
import type { DocumentSnapshot, QueryDocumentSnapshot, Timestamp, WriteResult } from 'firebase-admin/firestore';
import { firestore } from '../firebaseAdmin.js';
import type { AuthenticatedRequest } from '../middleware/authenticate.js';
import { authenticate } from '../middleware/authenticate.js';
import { z } from 'zod';
import asyncHandler from '../utils/asyncHandler.js';
import {
  exportArtifactsToDelimited,
  exportArtifactsToMarkdown,
  exportLexemesToCsv,
  exportLexemesToMarkdown,
  importArtifactsFromCsv,
  parseConlangLexemesFromCsv,
  parseConlangLexemesFromMarkdown,
  timestampToIso,
} from '../utils/importExport.js';
import type {
  Artifact,
  CanonicalSensitivityLevel,
  ConlangLexeme,
  MemorySyncConversation,
  MemorySyncSuggestion,
  ConversationMessage,
  MemorySyncScope,
  MemorySyncStatus,
  NpcMemoryRun,
  Project,
  UserProfile,
} from '../types.js';
import {
  assertArtifactContentCompliance,
  assertProjectContentCompliance,
  ComplianceError,
  enforceShareLinkRetention,
  sanitizeForExternalShare,
} from '../compliance/enforcement.js';
import {
  cacheNanoBananaImage,
  deleteCachedNanoBananaImage,
  getCachedNanoBananaUrl,
  isNanoBananaCacheEnabled,
} from '../utils/nanoBananaCache.js';

const router = Router();

export class ShareLookupError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ShareLookupError';
    this.status = status;
  }
}

export interface SharedProjectPayload {
  project: Project;
  artifacts: Artifact[];
}

const respondWithComplianceError = (res: Response, error: unknown): error is ComplianceError => {
  if (error instanceof ComplianceError) {
    const status = error.violation === 'retention' ? 410 : 422;
    res.status(status).json({
      error: error.message,
      violation: error.violation,
      context: error.context ?? {},
    });
    return true;
  }
  return false;
};

const normalizeNanoBananaImage = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  return nanoBananaImagePattern.test(value) ? value : null;
};

const mapProject = (doc: QueryDocumentSnapshot | DocumentSnapshot, ownerId: string): Project => {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    ownerId,
    title: typeof data.title === 'string' ? data.title : 'Untitled Project',
    summary: typeof data.summary === 'string' ? data.summary : '',
    status: typeof data.status === 'string' ? data.status : 'active',
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    nanoBananaImage: normalizeNanoBananaImage((data as { nanoBananaImage?: unknown }).nanoBananaImage),
    createdAt: timestampToIso((data as { createdAt?: Timestamp }).createdAt),
    updatedAt: timestampToIso((data as { updatedAt?: Timestamp }).updatedAt),
  };
};

const mapArtifact = (doc: QueryDocumentSnapshot | DocumentSnapshot, ownerId: string): Artifact => {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    ownerId,
    projectId: typeof data.projectId === 'string' ? data.projectId : '',
    type: typeof data.type === 'string' ? data.type : 'Unknown',
    title: typeof data.title === 'string' ? data.title : 'Untitled Artifact',
    summary: typeof data.summary === 'string' ? data.summary : '',
    status: typeof data.status === 'string' ? data.status : 'idea',
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    relations: Array.isArray(data.relations) ? (data.relations as Artifact['relations']) : [],
    data: data.data ?? {},
    createdAt: timestampToIso((data as { createdAt?: Timestamp }).createdAt),
    updatedAt: timestampToIso((data as { updatedAt?: Timestamp }).updatedAt),
  };
};

const toIsoString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object' && 'toDate' in value) {
    return timestampToIso(value as Timestamp);
  }
  return undefined;
};

const isMemorySyncStatus = (value: unknown): value is MemorySyncStatus =>
  value === 'pending' || value === 'approved' || value === 'rejected';

const isMemorySyncScope = (value: unknown): value is MemorySyncScope => value === 'npc' || value === 'global';

const mapTranscriptEntry = (value: unknown): ConversationMessage | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const { id, role, text, timestamp } = value as {
    id?: unknown;
    role?: unknown;
    text?: unknown;
    timestamp?: unknown;
  };

  if (typeof id !== 'string') {
    return null;
  }

  if (role !== 'creator' && role !== 'gemini') {
    return null;
  }

  if (typeof text !== 'string' || text.trim().length === 0) {
    return null;
  }

  return {
    id,
    role,
    text,
    timestamp: toIsoString(timestamp) ?? new Date().toISOString(),
  };
};

const mapMemorySuggestion = (value: unknown): MemorySyncSuggestion | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const {
    id,
    statement,
    rationale,
    status,
    createdAt,
    updatedAt,
    artifactId,
    artifactTitle,
    tags,
    canonicalSensitivity,
  } = value as {
    id?: unknown;
    statement?: unknown;
    rationale?: unknown;
    status?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
    artifactId?: unknown;
    artifactTitle?: unknown;
    tags?: unknown;
    canonicalSensitivity?: unknown;
  };

  if (typeof id !== 'string' || typeof statement !== 'string') {
    return null;
  }

  const suggestionStatus: MemorySyncStatus = isMemorySyncStatus(status) ? status : 'pending';
  const normalizedTags = Array.isArray(tags)
    ? (tags as unknown[]).filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
    : [];

  const sensitivity: CanonicalSensitivityLevel =
    canonicalSensitivity === 'high'
      ? 'high'
      : canonicalSensitivity === 'moderate'
        ? 'moderate'
        : 'low';

  return {
    id,
    statement,
    rationale: typeof rationale === 'string' ? rationale : '',
    status: suggestionStatus,
    createdAt: toIsoString(createdAt) ?? new Date().toISOString(),
    updatedAt: toIsoString(updatedAt),
    artifactId: typeof artifactId === 'string' ? artifactId : undefined,
    artifactTitle: typeof artifactTitle === 'string' ? artifactTitle : undefined,
    tags: normalizedTags.length > 0 ? normalizedTags : undefined,
    canonicalSensitivity: sensitivity,
  };
};

const mapMemoryConversationDoc = (doc: QueryDocumentSnapshot): MemorySyncConversation | null => {
  const data = doc.data() ?? {};
  const projectId = typeof (data as { projectId?: unknown }).projectId === 'string'
    ? (data as { projectId: string }).projectId
    : '';

  if (!projectId) {
    return null;
  }

  const transcript = Array.isArray((data as { transcript?: unknown }).transcript)
    ? ((data as { transcript?: unknown[] }).transcript ?? [])
        .map(mapTranscriptEntry)
        .filter((entry): entry is ConversationMessage => entry !== null)
    : [];

  const suggestions = Array.isArray((data as { suggestions?: unknown }).suggestions)
    ? ((data as { suggestions?: unknown[] }).suggestions ?? [])
        .map(mapMemorySuggestion)
        .filter((suggestion): suggestion is MemorySyncSuggestion => suggestion !== null)
    : [];

  const scope = isMemorySyncScope((data as { scope?: unknown }).scope) ? ((data as { scope?: MemorySyncScope }).scope as MemorySyncScope) : 'global';

  return {
    id: doc.id,
    projectId,
    title: typeof (data as { title?: unknown }).title === 'string' ? (data as { title: string }).title : 'Gemini sync',
    summary: typeof (data as { summary?: unknown }).summary === 'string' ? (data as { summary: string }).summary : '',
    scope,
    updatedAt: toIsoString((data as { updatedAt?: unknown }).updatedAt) ?? new Date().toISOString(),
    lastSyncedAt: toIsoString((data as { lastSyncedAt?: unknown }).lastSyncedAt),
    transcript,
    suggestions,
  };
};

const mapNpcMemoryRunDoc = (doc: QueryDocumentSnapshot): NpcMemoryRun | null => {
  const data = doc.data() ?? {};
  const projectId = typeof (data as { projectId?: unknown }).projectId === 'string'
    ? (data as { projectId: string }).projectId
    : '';
  const npcArtifactId = typeof (data as { npcArtifactId?: unknown }).npcArtifactId === 'string'
    ? (data as { npcArtifactId: string }).npcArtifactId
    : '';

  if (!projectId || !npcArtifactId) {
    return null;
  }

  const pending = typeof (data as { pendingSuggestions?: unknown }).pendingSuggestions === 'number'
    ? (data as { pendingSuggestions: number }).pendingSuggestions
    : 0;
  const approved = typeof (data as { approvedSuggestions?: unknown }).approvedSuggestions === 'number'
    ? (data as { approvedSuggestions: number }).approvedSuggestions
    : 0;

  const sensitivity: CanonicalSensitivityLevel =
    (data as { highestCanonicalSensitivity?: unknown }).highestCanonicalSensitivity === 'high'
      ? 'high'
      : (data as { highestCanonicalSensitivity?: unknown }).highestCanonicalSensitivity === 'moderate'
        ? 'moderate'
        : 'low';

  const scope = isMemorySyncScope((data as { scope?: unknown }).scope) ? ((data as { scope?: MemorySyncScope }).scope as MemorySyncScope) : 'npc';

  return {
    id: doc.id,
    projectId,
    npcArtifactId,
    npcName: typeof (data as { npcName?: unknown }).npcName === 'string' ? (data as { npcName: string }).npcName : 'Unnamed NPC',
    npcType: typeof (data as { npcType?: unknown }).npcType === 'string' ? (data as { npcType: string }).npcType : 'Character',
    scope,
    pendingSuggestions: Math.max(0, pending),
    approvedSuggestions: Math.max(0, approved),
    highestCanonicalSensitivity: sensitivity,
    lastRunAt: toIsoString((data as { lastRunAt?: unknown }).lastRunAt),
    lastApprovedAt: toIsoString((data as { lastApprovedAt?: unknown }).lastApprovedAt),
  };
};

const findProjectShareDoc = async (
  projectId: string,
  ownerId: string,
): Promise<QueryDocumentSnapshot | undefined> => {
  const snapshot = await firestore
    .collection('projectShares')
    .where('projectId', '==', projectId)
    .where('ownerId', '==', ownerId)
    .limit(1)
    .get();

  return snapshot.docs[0];
};

const ensureProjectOwnership = async (
  projectId: string,
  ownerId: string,
): Promise<DocumentSnapshot | null> => {
  const projectSnapshot = await firestore.collection('projects').doc(projectId).get();
  if (!projectSnapshot.exists) {
    return null;
  }

  const projectOwner = (projectSnapshot.data() as { ownerId?: unknown })?.ownerId;
  if (typeof projectOwner !== 'string' || projectOwner !== ownerId) {
    return null;
  }

  return projectSnapshot;
};

export const loadSharedProjectPayload = async (shareId: string): Promise<SharedProjectPayload> => {
  if (!shareId) {
    throw new ShareLookupError(400, 'Share identifier is required.');
  }

  const shareSnapshot = await firestore.collection('projectShares').doc(shareId).get();
  if (!shareSnapshot.exists) {
    throw new ShareLookupError(404, 'Shared project not found.');
  }

  try {
    await enforceShareLinkRetention(shareSnapshot, async () => {
      await shareSnapshot.ref.delete();
    });
  } catch (error) {
    if (error instanceof ComplianceError) {
      throw error;
    }
    throw error;
  }

  const shareData = shareSnapshot.data() as { projectId?: unknown; ownerId?: unknown } | undefined;
  const projectId = typeof shareData?.projectId === 'string' ? shareData.projectId : null;
  const ownerId = typeof shareData?.ownerId === 'string' ? shareData.ownerId : null;

  if (!projectId || !ownerId) {
    throw new ShareLookupError(404, 'Shared project not found.');
  }

  const projectSnapshot = await firestore.collection('projects').doc(projectId).get();
  if (!projectSnapshot.exists) {
    throw new ShareLookupError(404, 'Shared project not found.');
  }

  const projectOwner = (projectSnapshot.data() as { ownerId?: unknown })?.ownerId;
  if (typeof projectOwner !== 'string' || projectOwner !== ownerId) {
    throw new ShareLookupError(404, 'Shared project not found.');
  }

  const artifactsSnapshot = await firestore
    .collection('artifacts')
    .where('projectId', '==', projectId)
    .get();

  const project = sanitizeForExternalShare(mapProject(projectSnapshot, ownerId));
  const artifacts = artifactsSnapshot.docs.map((doc) =>
    sanitizeForExternalShare(mapArtifact(doc, ownerId)),
  );

  return { project, artifacts };
};

router.get(
  '/share/:shareId',
  asyncHandler(async (req, res) => {
    try {
      const payload = await loadSharedProjectPayload(req.params.shareId);
      res.json(payload);
    } catch (error) {
      if (respondWithComplianceError(res, error)) {
        return;
      }
      if (error instanceof ShareLookupError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      throw error;
    }
  }),
);

router.get(
  '/share/:shareId/nano-banana.png',
  asyncHandler(async (req, res) => {
    try {
      const { shareId } = req.params;

      if (isNanoBananaCacheEnabled()) {
        const cachedUrl = await getCachedNanoBananaUrl(shareId);
        if (cachedUrl) {
          res.set('Cache-Control', 'public, max-age=300').redirect(cachedUrl);
          return;
        }
      }

      const payload = await loadSharedProjectPayload(shareId);
      const dataUrl = payload.project.nanoBananaImage;
      if (!dataUrl || typeof dataUrl !== 'string' || !nanoBananaImagePattern.test(dataUrl)) {
        res.status(404).json({ error: 'Nano banana image not found' });
        return;
      }
      const [, encoded] = dataUrl.split(',', 2);
      if (!encoded) {
        res.status(404).json({ error: 'Nano banana image not found' });
        return;
      }
      const buffer = Buffer.from(encoded, 'base64');

      if (isNanoBananaCacheEnabled()) {
        try {
          const cachedUrl = await cacheNanoBananaImage(shareId, buffer);
          if (cachedUrl) {
            res.set('Cache-Control', 'public, max-age=300').redirect(cachedUrl);
            return;
          }
        } catch (cacheError) {
          console.warn('Failed to cache nano banana image', cacheError);
        }
      }

      res.set('Cache-Control', 'public, max-age=600');
      res.type('png').send(buffer);
    } catch (error) {
      if (respondWithComplianceError(res, error)) {
        return;
      }
      if (error instanceof ShareLookupError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      throw error;
    }
  }),
);

router.use(authenticate);

router.get(
  '/memory-sync',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const ownerId = req.user?.uid;
    if (!ownerId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const [conversationSnapshot, npcRunsSnapshot] = await Promise.all([
      firestore.collection('memorySyncConversations').where('ownerId', '==', ownerId).get(),
      firestore.collection('npcMemoryRuns').where('ownerId', '==', ownerId).get(),
    ]);

    const conversations = conversationSnapshot.docs
      .map(mapMemoryConversationDoc)
      .filter((conversation): conversation is MemorySyncConversation => conversation !== null);

    const npcMemoryRuns = npcRunsSnapshot.docs
      .map(mapNpcMemoryRunDoc)
      .filter((run): run is NpcMemoryRun => run !== null);

    res.json({ conversations, npcMemoryRuns });
  }),
);

const MAX_BATCH_SIZE = 400;

const commitInBatches = async (docs: QueryDocumentSnapshot[]): Promise<void> => {
  if (docs.length === 0) {
    return;
  }

  let batch = firestore.batch();
  let operations = 0;
  const commits: Promise<WriteResult[]>[] = [];

  docs.forEach((doc) => {
    batch.delete(doc.ref);
    operations += 1;

    if (operations >= MAX_BATCH_SIZE) {
      commits.push(batch.commit());
      batch = firestore.batch();
      operations = 0;
    }
  });

  if (operations > 0) {
    commits.push(batch.commit());
  }

  await Promise.all(commits);
};

const deleteOwnedDocuments = async (collection: string, ownerId: string): Promise<void> => {
  const snapshot = await firestore.collection(collection).where('ownerId', '==', ownerId).get();
  await commitInBatches(snapshot.docs);
};

const defaultSettings = {
  theme: 'system' as const,
  aiTipsEnabled: true,
};

const themePreferenceSchema = z.enum(['system', 'light', 'dark']);

const nanoBananaImagePattern = /^data:image\/png;base64,/i;

const nanoBananaImageSchema = z
  .string()
  .regex(nanoBananaImagePattern, 'Nano banana image must be a base64-encoded PNG data URL.')
  .max(1_200_000, 'Nano banana image is too large.');

const projectSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1),
  summary: z.string().default(''),
  status: z.string().default('active'),
  tags: z.array(z.string()).default([]),
  nanoBananaImage: nanoBananaImageSchema.optional().nullable(),
});

const projectUpdateSchema = projectSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be provided for update.',
});

const profileSettingsUpdateSchema = z
  .object({
    theme: themePreferenceSchema.optional(),
    aiTipsEnabled: z.boolean().optional(),
  })
  .partial();

const profileUpdateSchema = z
  .object({
    displayName: z.string().trim().min(1).optional(),
    photoURL: z
      .string()
      .url()
      .or(z.literal(''))
      .optional(),
    achievementsUnlocked: z.array(z.string()).optional(),
    questlinesClaimed: z.array(z.string()).optional(),
    settings: profileSettingsUpdateSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update.',
  });

const xpUpdateSchema = z.object({
  amount: z.number().int(),
});

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const parseDateKey = (key?: string): number | null => {
  if (!key) return null;
  const parts = key.split('-').map(Number);
  if (parts.length !== 3 || parts.some((value) => Number.isNaN(value))) {
    return null;
  }
  const [year, month, day] = parts;
  return Date.UTC(year, month - 1, day);
};

const formatDateKey = (date: Date): string => date.toISOString().slice(0, 10);

const advanceStreakSnapshot = (
  snapshot: { streakCount: number; bestStreak: number; lastActiveDate: string | undefined },
  todayKey: string,
) => {
  const todayValue = parseDateKey(todayKey);
  if (todayValue === null) {
    return snapshot;
  }

  const normalizedCurrent = Math.max(snapshot.streakCount ?? 0, 0);
  const normalizedBest = Math.max(snapshot.bestStreak ?? 0, 0);

  const lastValue = parseDateKey(snapshot.lastActiveDate);
  if (lastValue === null) {
    const initialStreak = Math.max(normalizedCurrent, 1);
    const best = Math.max(normalizedBest, initialStreak);
    return {
      streakCount: initialStreak,
      bestStreak: best,
      lastActiveDate: todayKey,
    };
  }

  const diff = Math.round((todayValue - lastValue) / MS_PER_DAY);
  if (diff <= 0) {
    return {
      streakCount: normalizedCurrent,
      bestStreak: normalizedBest,
      lastActiveDate: snapshot.lastActiveDate,
    };
  }

  const nextStreak = diff === 1 ? normalizedCurrent + 1 : 1;
  const nextBest = Math.max(normalizedBest, nextStreak);
  return {
    streakCount: nextStreak,
    bestStreak: nextBest,
    lastActiveDate: todayKey,
  };
};

const createDefaultProfile = (
  uid: string,
  email: string | undefined,
  displayName: string | undefined,
  photoURL: string | undefined,
  xp = 0,
): UserProfile => {
  const normalizedEmail = email ?? '';
  const fallbackDisplayName = normalizedEmail ? normalizedEmail.split('@')[0] ?? 'Creator' : 'Creator';
  return {
    uid,
    email: normalizedEmail,
    displayName: displayName && displayName.trim().length > 0 ? displayName : fallbackDisplayName,
    photoURL: photoURL ?? undefined,
    xp,
    streakCount: xp > 0 ? 1 : 0,
    bestStreak: xp > 0 ? 1 : 0,
    lastActiveDate: xp > 0 ? formatDateKey(new Date()) : undefined,
    achievementsUnlocked: [],
    questlinesClaimed: [],
    settings: { ...defaultSettings },
  };
};

const mapProfileFromSnapshot = (doc: DocumentSnapshot | null, defaults: UserProfile): UserProfile => {
  const data = doc?.data() ?? {};

  const achievements = Array.isArray((data as { achievementsUnlocked?: unknown }).achievementsUnlocked)
    ? ((data as { achievementsUnlocked: string[] }).achievementsUnlocked ?? [])
    : defaults.achievementsUnlocked;

  const questlines = Array.isArray((data as { questlinesClaimed?: unknown }).questlinesClaimed)
    ? ((data as { questlinesClaimed: string[] }).questlinesClaimed ?? [])
    : defaults.questlinesClaimed;

  const settingsValue = (data as { settings?: unknown }).settings;
  const mappedSettings =
    settingsValue && typeof settingsValue === 'object'
      ? { ...defaultSettings, ...(settingsValue as Record<string, unknown>) }
      : { ...defaultSettings };

  return {
    ...defaults,
    email: typeof (data as { email?: unknown }).email === 'string' ? String((data as { email: string }).email) : defaults.email,
    displayName:
      typeof (data as { displayName?: unknown }).displayName === 'string'
        ? String((data as { displayName: string }).displayName)
        : defaults.displayName,
    photoURL:
      typeof (data as { photoURL?: unknown }).photoURL === 'string' && (data as { photoURL: string }).photoURL
        ? String((data as { photoURL: string }).photoURL)
        : defaults.photoURL,
    xp: typeof (data as { xp?: unknown }).xp === 'number' ? Number((data as { xp: number }).xp) : defaults.xp,
    streakCount:
      typeof (data as { streakCount?: unknown }).streakCount === 'number'
        ? Number((data as { streakCount: number }).streakCount)
        : defaults.streakCount,
    bestStreak:
      typeof (data as { bestStreak?: unknown }).bestStreak === 'number'
        ? Number((data as { bestStreak: number }).bestStreak)
        : defaults.bestStreak,
    lastActiveDate:
      typeof (data as { lastActiveDate?: unknown }).lastActiveDate === 'string'
        ? String((data as { lastActiveDate: string }).lastActiveDate)
        : defaults.lastActiveDate,
    achievementsUnlocked: achievements,
    questlinesClaimed: questlines,
    settings: mappedSettings,
    createdAt: timestampToIso((data as { createdAt?: Timestamp }).createdAt),
    updatedAt: timestampToIso((data as { updatedAt?: Timestamp }).updatedAt),
  };
};

const relationSchema = z.object({
  toId: z.string().min(1),
  kind: z.string().min(1),
});

const artifactSchema = z.object({
  id: z.string().min(1).optional(),
  type: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().default(''),
  status: z.string().default('idea'),
  tags: z.array(z.string()).default([]),
  relations: z.array(relationSchema).default([]),
  data: z.unknown().optional(),
});

const artifactUpdateSchema = artifactSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be provided for update.',
});

const encodePageToken = (title: string, id: string) =>
  Buffer.from(JSON.stringify({ title, id }), 'utf8').toString('base64url');

const decodePageToken = (token: string): { title: string; id: string } | null => {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded);
    if (typeof parsed?.title === 'string' && typeof parsed?.id === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

router.get('/profile', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { uid, email, displayName, photoURL } = req.user!;
  const docRef = firestore.collection('users').doc(uid);
  const snapshot = await docRef.get();
  const defaults = createDefaultProfile(uid, email, displayName, photoURL, 0);

  if (!snapshot.exists) {
    await docRef.set(
      {
        uid,
        email: defaults.email,
        displayName: defaults.displayName,
        photoURL: defaults.photoURL ?? null,
        xp: defaults.xp,
        streakCount: defaults.streakCount,
        bestStreak: defaults.bestStreak,
        lastActiveDate: defaults.lastActiveDate ?? null,
        achievementsUnlocked: defaults.achievementsUnlocked,
        questlinesClaimed: defaults.questlinesClaimed,
        settings: defaults.settings,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: false },
    );
    return res.json(defaults);
  }

  const profile = mapProfileFromSnapshot(snapshot, defaults);
  res.json(profile);
}));

router.patch('/profile', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { uid, email, displayName, photoURL } = req.user!;
  const docRef = firestore.collection('users').doc(uid);
  const parsed = profileUpdateSchema.parse(req.body);

  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef);
    const defaults = createDefaultProfile(uid, email, displayName, photoURL, 0);

    let currentProfile: UserProfile;
    if (!snapshot.exists) {
      currentProfile = defaults;
      transaction.set(
        docRef,
        {
          uid,
          email: defaults.email,
          displayName: defaults.displayName,
          photoURL: defaults.photoURL ?? null,
          xp: defaults.xp,
          streakCount: defaults.streakCount,
          bestStreak: defaults.bestStreak,
          lastActiveDate: defaults.lastActiveDate ?? null,
          achievementsUnlocked: defaults.achievementsUnlocked,
          questlinesClaimed: defaults.questlinesClaimed,
          settings: defaults.settings,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: false },
      );
    } else {
      currentProfile = mapProfileFromSnapshot(snapshot, defaults);
    }

    const nextProfile: UserProfile = {
      ...currentProfile,
      achievementsUnlocked: [...currentProfile.achievementsUnlocked],
      questlinesClaimed: [...currentProfile.questlinesClaimed],
      settings: { ...currentProfile.settings },
    };

    if (parsed.displayName !== undefined) {
      nextProfile.displayName = parsed.displayName;
    }

    if (parsed.photoURL !== undefined) {
      const trimmed = parsed.photoURL.trim();
      nextProfile.photoURL = trimmed.length > 0 ? trimmed : undefined;
    }

    if (parsed.achievementsUnlocked !== undefined) {
      const merged = new Set([...nextProfile.achievementsUnlocked, ...parsed.achievementsUnlocked]);
      nextProfile.achievementsUnlocked = Array.from(merged);
    }

    if (parsed.questlinesClaimed !== undefined) {
      const merged = new Set([...nextProfile.questlinesClaimed, ...parsed.questlinesClaimed]);
      nextProfile.questlinesClaimed = Array.from(merged);
    }

    if (parsed.settings) {
      nextProfile.settings = {
        ...nextProfile.settings,
        ...parsed.settings,
      };
    }

    const update: Record<string, unknown> = {
      displayName: nextProfile.displayName,
      photoURL: nextProfile.photoURL ?? null,
      achievementsUnlocked: nextProfile.achievementsUnlocked,
      questlinesClaimed: nextProfile.questlinesClaimed,
      settings: nextProfile.settings,
      updatedAt: FieldValue.serverTimestamp(),
    };

    transaction.set(docRef, update, { merge: true });
  });

  const updatedSnapshot = await docRef.get();
  const defaults = createDefaultProfile(uid, email, displayName, photoURL, 0);
  const profile = mapProfileFromSnapshot(updatedSnapshot, defaults);
  res.json(profile);
}));

router.post('/profile/xp', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { uid, email, displayName, photoURL } = req.user!;
  const { amount } = xpUpdateSchema.parse(req.body);
  const docRef = firestore.collection('users').doc(uid);

  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef);
    const defaults = createDefaultProfile(uid, email, displayName, photoURL, 0);
    let currentProfile: UserProfile;

    if (!snapshot.exists) {
      currentProfile = defaults;
      transaction.set(
        docRef,
        {
          uid,
          email: defaults.email,
          displayName: defaults.displayName,
          photoURL: defaults.photoURL ?? null,
          xp: defaults.xp,
          streakCount: defaults.streakCount,
          bestStreak: defaults.bestStreak,
          lastActiveDate: defaults.lastActiveDate ?? null,
          achievementsUnlocked: defaults.achievementsUnlocked,
          questlinesClaimed: defaults.questlinesClaimed,
          settings: defaults.settings,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: false },
      );
    } else {
      currentProfile = mapProfileFromSnapshot(snapshot, defaults);
    }

    const nextXp = Math.max(0, currentProfile.xp + amount);
    const streakBase = {
      streakCount: currentProfile.streakCount,
      bestStreak: currentProfile.bestStreak,
      lastActiveDate: currentProfile.lastActiveDate,
    };

    let streakResult = streakBase;
    if (amount > 0) {
      const todayKey = formatDateKey(new Date());
      streakResult = advanceStreakSnapshot(streakBase, todayKey);
    }

    const update: Record<string, unknown> = {
      xp: nextXp,
      streakCount: streakResult.streakCount,
      bestStreak: streakResult.bestStreak,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (amount > 0) {
      update.lastActiveDate = streakResult.lastActiveDate ?? null;
    }

    transaction.set(docRef, update, { merge: true });
  });

  const snapshot = await docRef.get();
  const defaults = createDefaultProfile(uid, email, displayName, photoURL, 0);
  const profile = mapProfileFromSnapshot(snapshot, defaults);
  res.json(profile);
}));

router.get('/projects', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { uid } = req.user!;
  const pageSize = Math.min(Math.max(Number.parseInt(String(req.query.pageSize ?? '25'), 10) || 25, 1), 100);
  const pageToken = typeof req.query.pageToken === 'string' ? req.query.pageToken : undefined;

  let query = firestore
    .collection('projects')
    .where('ownerId', '==', uid)
    .orderBy('title')
    .orderBy(FieldPath.documentId())
    .limit(pageSize + 1);

  if (pageToken) {
    const cursor = decodePageToken(pageToken);
    if (cursor) {
      query = query.startAfter(cursor.title, cursor.id);
    }
  }

  const snapshot = await query.get();
  const projects = snapshot.docs.slice(0, pageSize).map((doc) => mapProject(doc, uid));
  const nextDoc = snapshot.docs[pageSize];
  const nextPageToken = nextDoc ? encodePageToken(String(nextDoc.get('title') ?? ''), nextDoc.id) : undefined;

  res.json({ projects, nextPageToken });
}));

router.post('/projects', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { uid } = req.user!;
  const parsed = projectSchema.parse(req.body);
  const docRef = parsed.id
    ? firestore.collection('projects').doc(parsed.id)
    : firestore.collection('projects').doc();

  try {
    assertProjectContentCompliance(parsed, {
      actorId: uid,
      projectId: docRef.id,
      action: 'create-project',
    });
  } catch (error) {
    if (respondWithComplianceError(res, error)) {
      return;
    }
    throw error;
  }

  if (parsed.id) {
    const existing = await docRef.get();
    if (existing.exists) {
      if (existing.get('ownerId') !== uid) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      return res.status(409).json({ error: 'Project already exists' });
    }
  }

  const payload = {
    ownerId: uid,
    title: parsed.title,
    summary: parsed.summary ?? '',
    status: parsed.status ?? 'active',
    tags: parsed.tags ?? [],
    nanoBananaImage: parsed.nanoBananaImage ?? null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await docRef.set(payload, { merge: false });
  const snapshot = await docRef.get();
  res.status(201).json(mapProject(snapshot, uid));
}));

router.get('/projects/:id/share', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { uid } = req.user!;
  const projectId = req.params.id;

  if (!(await ensureProjectOwnership(projectId, uid))) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const shareDoc = await findProjectShareDoc(projectId, uid);
  if (!shareDoc) {
    res.json({ enabled: false });
    return;
  }

  res.json({ enabled: true, shareId: shareDoc.id });
}));

router.post('/projects/:id/share', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { uid } = req.user!;
  const projectId = req.params.id;

  if (!(await ensureProjectOwnership(projectId, uid))) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const existing = await findProjectShareDoc(projectId, uid);
  if (existing) {
    await existing.ref.update({ updatedAt: FieldValue.serverTimestamp() });
    res.json({ shareId: existing.id });
    return;
  }

  const docRef = firestore.collection('projectShares').doc();
  await docRef.set({
    ownerId: uid,
    projectId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  res.status(201).json({ shareId: docRef.id });
}));

router.delete('/projects/:id/share', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { uid } = req.user!;
  const projectId = req.params.id;

  if (!(await ensureProjectOwnership(projectId, uid))) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const existing = await findProjectShareDoc(projectId, uid);
  if (!existing) {
    res.json({ success: true });
    return;
  }

  await existing.ref.delete();
  if (isNanoBananaCacheEnabled()) {
    deleteCachedNanoBananaImage(existing.id).catch((error) => {
      console.warn('Failed to delete cached nano banana image', error);
    });
  }
  res.json({ success: true });
}));

router.patch('/projects/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { uid } = req.user!;
  const parsed = projectUpdateSchema.parse(req.body);
  const docRef = firestore.collection('projects').doc(req.params.id);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return res.status(404).json({ error: 'Project not found' });
  }

  if (snapshot.get('ownerId') !== uid) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (parsed.title !== undefined) update.title = parsed.title;
  if (parsed.summary !== undefined) update.summary = parsed.summary;
  if (parsed.status !== undefined) update.status = parsed.status;
  if (parsed.tags !== undefined) update.tags = parsed.tags;
  if (parsed.nanoBananaImage !== undefined) update.nanoBananaImage = parsed.nanoBananaImage;

  try {
    assertProjectContentCompliance(
      {
        title: update.title ?? snapshot.get('title'),
        summary: update.summary ?? snapshot.get('summary'),
        tags: update.tags ?? snapshot.get('tags'),
      },
      {
        actorId: uid,
        projectId: docRef.id,
        action: 'update-project',
      },
    );
  } catch (error) {
    if (respondWithComplianceError(res, error)) {
      return;
    }
    throw error;
  }

  await docRef.set(update, { merge: true });
  const updated = await docRef.get();
  res.json(mapProject(updated, uid));
}));

router.delete('/projects/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { uid } = req.user!;
  const docRef = firestore.collection('projects').doc(req.params.id);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return res.status(404).json({ error: 'Project not found' });
  }
  if (snapshot.get('ownerId') !== uid) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await docRef.delete();
  res.status(204).send();
}));

router.get('/projects/:projectId/artifacts', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { uid } = req.user!;
  const { projectId } = req.params;
  const pageSize = Math.min(Math.max(Number.parseInt(String(req.query.pageSize ?? '50'), 10) || 50, 1), 200);
  const pageToken = typeof req.query.pageToken === 'string' ? req.query.pageToken : undefined;

  let query = firestore
    .collection('artifacts')
    .where('ownerId', '==', uid)
    .where('projectId', '==', projectId)
    .orderBy('title')
    .orderBy(FieldPath.documentId())
    .limit(pageSize + 1);

  if (pageToken) {
    const cursor = decodePageToken(pageToken);
    if (cursor) {
      query = query.startAfter(cursor.title, cursor.id);
    }
  }

  const snapshot = await query.get();
  const artifacts = snapshot.docs.slice(0, pageSize).map((doc) => mapArtifact(doc, uid));
  const nextDoc = snapshot.docs[pageSize];
  const nextPageToken = nextDoc ? encodePageToken(String(nextDoc.get('title') ?? ''), nextDoc.id) : undefined;

  res.json({ artifacts, nextPageToken });
}));

router.post('/projects/:projectId/artifacts', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { uid } = req.user!;
  const { projectId } = req.params;
  const bodySchema = z.object({ artifacts: z.array(artifactSchema) });
  const parsed = bodySchema.parse(req.body);

  const projectSnapshot = await firestore.collection('projects').doc(projectId).get();
  if (!projectSnapshot.exists) {
    return res.status(404).json({ error: 'Project not found' });
  }
  if (projectSnapshot.get('ownerId') !== uid) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const artifactEntries = parsed.artifacts.map((artifactInput) => ({
    input: artifactInput,
    ref: artifactInput.id
      ? firestore.collection('artifacts').doc(artifactInput.id)
      : firestore.collection('artifacts').doc(),
  }));

  const seenIds = new Set<string>();
  for (const entry of artifactEntries) {
    const artifactId = entry.ref.id;
    if (seenIds.has(artifactId)) {
      return res.status(400).json({ error: `Duplicate artifact id detected: ${artifactId}` });
    }
    seenIds.add(artifactId);

    if (entry.input.id) {
      const existing = await entry.ref.get();
      if (existing.exists) {
        if (existing.get('ownerId') !== uid) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        return res.status(409).json({ error: `Artifact already exists: ${artifactId}` });
      }
    }

    try {
      assertArtifactContentCompliance(entry.input, {
        actorId: uid,
        projectId,
        artifactId,
        action: 'create-artifact',
      });
    } catch (error) {
      if (respondWithComplianceError(res, error)) {
        return;
      }
      throw error;
    }
  }

  const created: Artifact[] = [];

  await firestore.runTransaction(async (transaction) => {
    for (const { input: artifactInput, ref: docRef } of artifactEntries) {
      const artifact: Artifact = {
        id: docRef.id,
        ownerId: uid,
        projectId,
        type: artifactInput.type,
        title: artifactInput.title,
        summary: artifactInput.summary ?? '',
        status: artifactInput.status ?? 'idea',
        tags: artifactInput.tags ?? [],
        relations: artifactInput.relations ?? [],
        data: artifactInput.data ?? {},
      };

      transaction.set(docRef, {
        ownerId: uid,
        projectId,
        type: artifact.type,
        title: artifact.title,
        summary: artifact.summary,
        status: artifact.status,
        tags: artifact.tags,
        relations: artifact.relations,
        data: artifact.data,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      created.push({ ...artifact });
    }
  });

  res.status(201).json({ artifacts: created });
}));

router.patch('/artifacts/:artifactId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { uid } = req.user!;
  const parsed = artifactUpdateSchema.parse(req.body);
  const docRef = firestore.collection('artifacts').doc(req.params.artifactId);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return res.status(404).json({ error: 'Artifact not found' });
  }
  if (snapshot.get('ownerId') !== uid) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (parsed.title !== undefined) update.title = parsed.title;
  if (parsed.summary !== undefined) update.summary = parsed.summary;
  if (parsed.status !== undefined) update.status = parsed.status;
  if (parsed.tags !== undefined) update.tags = parsed.tags;
  if (parsed.relations !== undefined) update.relations = parsed.relations;
  if (parsed.data !== undefined) update.data = parsed.data;

  try {
    const existing = snapshot.data() as Partial<Artifact> | undefined;
    assertArtifactContentCompliance(
      {
        title: update.title ?? existing?.title,
        summary: update.summary ?? existing?.summary,
        tags: update.tags ?? existing?.tags,
        type: parsed.type ?? existing?.type,
      },
      {
        actorId: uid,
        projectId: snapshot.get('projectId'),
        artifactId: docRef.id,
        action: 'update-artifact',
      },
    );
  } catch (error) {
    if (respondWithComplianceError(res, error)) {
      return;
    }
    throw error;
  }

  await docRef.set(update, { merge: true });
  const updated = await docRef.get();
  res.json(mapArtifact(updated, uid));
}));

router.delete('/artifacts/:artifactId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { uid } = req.user!;
  const docRef = firestore.collection('artifacts').doc(req.params.artifactId);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return res.status(404).json({ error: 'Artifact not found' });
  }
  if (snapshot.get('ownerId') !== uid) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await docRef.delete();
  res.status(204).send();
}));

router.post('/projects/:projectId/import-artifacts', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { uid } = req.user!;
  const { projectId } = req.params;
  const bodySchema = z.object({ content: z.string().min(1) });
  const { content } = bodySchema.parse(req.body);

  try {
    const artifacts = importArtifactsFromCsv(content, projectId, uid);
    const persisted: Artifact[] = [];

    const projectSnapshot = await firestore.collection('projects').doc(projectId).get();
    if (!projectSnapshot.exists) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (projectSnapshot.get('ownerId') !== uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }

  const seenIds = new Set<string>();
  for (const artifact of artifacts) {
    if (seenIds.has(artifact.id)) {
      return res.status(400).json({ error: `Duplicate artifact id detected: ${artifact.id}` });
    }
    seenIds.add(artifact.id);

    const docRef = firestore.collection('artifacts').doc(artifact.id);
    const existing = await docRef.get();
    if (existing.exists) {
      if (existing.get('ownerId') !== uid) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      return res.status(409).json({ error: `Artifact already exists: ${artifact.id}` });
    }

    try {
      assertArtifactContentCompliance(artifact, {
        actorId: uid,
        projectId,
        artifactId: artifact.id,
        action: 'import-artifact',
      });
    } catch (error) {
      if (respondWithComplianceError(res, error)) {
        return;
      }
      throw error;
    }
  }

    await firestore.runTransaction(async (transaction) => {
      artifacts.forEach((artifact) => {
        const docRef = firestore.collection('artifacts').doc(artifact.id);
        transaction.set(docRef, {
          ownerId: uid,
          projectId: artifact.projectId,
          type: artifact.type,
          title: artifact.title,
          summary: artifact.summary,
          status: artifact.status,
          tags: artifact.tags,
          relations: artifact.relations,
          data: artifact.data,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        persisted.push({ ...artifact });
      });
    });

    res.json({ artifacts: persisted });
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Validation failed')) {
      return res.status(400).json({ error: e.message });
    }
    throw e;
  }
}));

router.get('/projects/:projectId/export', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { uid } = req.user!;
  const { projectId } = req.params;
  const format = typeof req.query.format === 'string' ? req.query.format.toLowerCase() : 'csv';

  const projectSnap = await firestore.collection('projects').doc(projectId).get();
  if (!projectSnap.exists || projectSnap.get('ownerId') !== uid) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const artifactsSnapshot = await firestore
    .collection('artifacts')
    .where('ownerId', '==', uid)
    .where('projectId', '==', projectId)
    .get();

  const project = mapProject(projectSnap, uid);
  const artifacts = artifactsSnapshot.docs.map((doc) => mapArtifact(doc, uid));

  if (format === 'markdown') {
    const markdown = exportArtifactsToMarkdown(project, artifacts);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${project.title.replace(/\s+/g, '_')}.md"`);
    return res.send(markdown);
  }

  const delimiter = format === 'tsv' ? '\t' : ',';
  const file = exportArtifactsToDelimited(artifacts, delimiter as ',' | '\t');
  res.setHeader('Content-Type', format === 'tsv' ? 'text/tab-separated-values; charset=utf-8' : 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${project.title.replace(/\s+/g, '_')}.${format === 'tsv' ? 'tsv' : 'csv'}"`);
  res.send(file);
}));

router.post('/lexicon/import/csv', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const bodySchema = z.object({ content: z.string().min(1) });
  const { content } = bodySchema.parse(req.body);
  const lexemes = parseConlangLexemesFromCsv(content);
  res.json({ lexemes });
}));

router.post('/lexicon/import/markdown', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const bodySchema = z.object({ content: z.string().min(1) });
  const { content } = bodySchema.parse(req.body);
  const lexemes = parseConlangLexemesFromMarkdown(content);
  res.json({ lexemes });
}));

router.delete('/account', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { uid } = req.user!;

  await deleteOwnedDocuments('artifacts', uid);
  await deleteOwnedDocuments('projects', uid);

  const userRef = firestore.collection('users').doc(uid);
  const userSnap = await userRef.get();
  if (userSnap.exists) {
    await userRef.delete();
  }

  res.status(204).send();
}));

router.post('/lexicon/export', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const bodySchema = z.object({ lexemes: z.array(z.object({
    id: z.string().optional(),
    lemma: z.string(),
    pos: z.string().default(''),
    gloss: z.string().default(''),
    etymology: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })), format: z.enum(['csv', 'markdown']).default('csv') });

  const { lexemes, format } = bodySchema.parse(req.body);
  const mapped: ConlangLexeme[] = lexemes.map((lexeme, index) => ({
    id: lexeme.id ?? `lex-${index}`,
    lemma: lexeme.lemma,
    pos: lexeme.pos ?? '',
    gloss: lexeme.gloss ?? '',
    etymology: lexeme.etymology,
    tags: lexeme.tags ?? [],
  }));

  if (format === 'markdown') {
    const markdown = exportLexemesToMarkdown(mapped);
    return res
      .setHeader('Content-Type', 'text/markdown; charset=utf-8')
      .send(markdown);
  }

  const csv = exportLexemesToCsv(mapped);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.send(csv);
}));

export default router;

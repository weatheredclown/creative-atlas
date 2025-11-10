import {
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getDocs,
  getFirestore,
  QueryDocumentSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import firebaseApp from './firebaseApp';
import { ArtifactType, TimelineData, TimelineEvent } from '../types';

export interface FirestoreTimelineHeatmapEvent {
  id: string;
  title: string;
  date?: string;
  description?: string;
}

export interface FirestoreTimelineHeatmapTimeline {
  worldId: string;
  worldTitle: string;
  timelineId: string;
  timelineTitle: string;
  events: FirestoreTimelineHeatmapEvent[];
}

export type TimelineHeatmapTimelinePayload = Omit<
  FirestoreTimelineHeatmapTimeline,
  'worldId' | 'worldTitle'
>;

export interface TimelineHeatmapSnapshotPayload {
  ownerId: string;
  worldId: string;
  worldTitle: string;
  timelines: TimelineHeatmapTimelinePayload[];
}

export interface TimelineHeatmapSnapshotDocument
  extends TimelineHeatmapSnapshotPayload {
  id: string;
  parsedTimelines: FirestoreTimelineHeatmapTimeline[];
  updatedAt?: unknown;
}

const HISTORY_HEATMAP_COLLECTION_SEGMENTS = ['timelineHeatmap'];

const toStringSafe = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
};

const parseEvents = (
  rawEvents: unknown,
  timelineKey: string,
): FirestoreTimelineHeatmapEvent[] => {
  if (!Array.isArray(rawEvents)) {
    return [];
  }

  return rawEvents
    .map((raw, index) => {
      if (!raw || typeof raw !== 'object') {
        return null;
      }
      const event = raw as Record<string, unknown>;
      const title = toStringSafe(event.title) ?? `Untitled event ${index + 1}`;
      const description = toStringSafe(event.description);
      const date = toStringSafe(event.date);
      const id =
        toStringSafe(event.id) ??
        toStringSafe(event.eventId) ??
        `${timelineKey}-event-${index + 1}`;

      const normalized: FirestoreTimelineHeatmapEvent = { id, title };
      if (description) {
        normalized.description = description;
      }
      if (date) {
        normalized.date = date;
      }
      return normalized;
    })
    .filter((event): event is FirestoreTimelineHeatmapEvent => Boolean(event));
};

const parseTimelineEntry = (
  doc: QueryDocumentSnapshot<DocumentData>,
  worldId: string,
  worldTitle: string,
  rawEntry: unknown,
  index: number,
): FirestoreTimelineHeatmapTimeline | null => {
  if (!rawEntry || typeof rawEntry !== 'object') {
    return null;
  }

  const entry = rawEntry as Record<string, unknown>;
  const timelineId =
    toStringSafe(entry.timelineId) ??
    toStringSafe(entry.id) ??
    `${doc.id}-timeline-${index + 1}`;
  const timelineTitle =
    toStringSafe(entry.timelineTitle) ??
    toStringSafe(entry.title) ??
    `Timeline ${index + 1}`;

  const events = parseEvents(
    entry.events ?? entry.timelineEvents ?? entry.beats ?? [],
    `${timelineId}-${doc.id}-${index}`,
  );

  return {
    worldId,
    worldTitle,
    timelineId,
    timelineTitle,
    events,
  };
};

const parseTimelineDocument = (
  doc: QueryDocumentSnapshot<DocumentData>,
): FirestoreTimelineHeatmapTimeline[] => {
  const data = doc.data();

  const worldId =
    toStringSafe(data.worldId) ??
    toStringSafe(data.projectId) ??
    doc.id;
  const worldTitle =
    toStringSafe(data.worldTitle) ??
    toStringSafe(data.worldName) ??
    toStringSafe(data.projectTitle) ??
    worldId;

  const timelines: FirestoreTimelineHeatmapTimeline[] = [];

  if (Array.isArray(data.timelines)) {
    data.timelines.forEach((entry, index) => {
      const timeline = parseTimelineEntry(doc, worldId, worldTitle, entry, index);
      if (timeline) {
        timelines.push(timeline);
      }
    });
    return timelines;
  }

  if (Array.isArray(data.timelineSnapshots)) {
    data.timelineSnapshots.forEach((entry, index) => {
      const timeline = parseTimelineEntry(doc, worldId, worldTitle, entry, index);
      if (timeline) {
        timelines.push(timeline);
      }
    });
    return timelines;
  }

  if (Array.isArray(data.timelineHeatmap)) {
    data.timelineHeatmap.forEach((entry, index) => {
      const timeline = parseTimelineEntry(doc, worldId, worldTitle, entry, index);
      if (timeline) {
        timelines.push(timeline);
      }
    });
    return timelines;
  }

  const events = parseEvents(
    data.events ?? data.timelineEvents ?? data.beats ?? [],
    `${doc.id}-direct`,
  );

  if (events.length === 0) {
    return [];
  }

  const timelineId = toStringSafe(data.timelineId) ?? doc.id;
  const timelineTitle = toStringSafe(data.timelineTitle) ?? toStringSafe(data.title) ?? doc.id;

  timelines.push({
    worldId,
    worldTitle,
    timelineId,
    timelineTitle,
    events,
  });

  return timelines;
};

const sanitizeDocumentSegment = (value: string): string => {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
};

export const getTimelineHeatmapDocumentId = (
  ownerId: string,
  worldId: string,
): string => {
  const ownerSegment = sanitizeDocumentSegment(ownerId) || 'owner';
  const worldSegment = sanitizeDocumentSegment(worldId) || 'world';
  return `${ownerSegment}__${worldSegment}`;
};

const normalizeTimelinePayload = (
  timeline: TimelineHeatmapTimelinePayload,
  index: number,
): TimelineHeatmapTimelinePayload => {
  const timelineId = toStringSafe(timeline.timelineId) ?? `timeline-${index + 1}`;
  const timelineTitle =
    toStringSafe(timeline.timelineTitle) ?? `Timeline ${index + 1}`;

  const events: FirestoreTimelineHeatmapEvent[] = Array.isArray(timeline.events)
    ? timeline.events.map((event, eventIndex) => {
        const title = toStringSafe(event.title) ?? `Event ${eventIndex + 1}`;
        const description = toStringSafe(event.description);
        const date = toStringSafe(event.date);
        const id =
          toStringSafe(event.id) ??
          toStringSafe(event.title) ??
          `${timelineId}-event-${eventIndex + 1}`;

        const normalizedEvent: FirestoreTimelineHeatmapEvent = {
          id,
          title,
        };

        if (description) {
          normalizedEvent.description = description;
        }

        if (date) {
          normalizedEvent.date = date;
        }

        return normalizedEvent;
      })
    : [];

  return {
    timelineId,
    timelineTitle,
    events,
  } satisfies TimelineHeatmapTimelinePayload;
};

export const publishTimelineHeatmapSnapshot = async (
  snapshot: TimelineHeatmapSnapshotPayload,
): Promise<string> => {
  const firestore = getFirestore(firebaseApp);
  const documentId = getTimelineHeatmapDocumentId(
    snapshot.ownerId,
    snapshot.worldId,
  );
  const documentRef = doc(
    firestore,
    ...HISTORY_HEATMAP_COLLECTION_SEGMENTS,
    documentId,
  );

  const timelines = snapshot.timelines.map(normalizeTimelinePayload);

  await setDoc(documentRef, {
    ownerId: snapshot.ownerId,
    worldId: snapshot.worldId,
    worldTitle: snapshot.worldTitle,
    timelines,
    updatedAt: serverTimestamp(),
  });

  return documentId;
};

export const deleteTimelineHeatmapSnapshot = async (
  documentId: string,
): Promise<void> => {
  const firestore = getFirestore(firebaseApp);
  const documentRef = doc(
    firestore,
    ...HISTORY_HEATMAP_COLLECTION_SEGMENTS,
    documentId,
  );
  await deleteDoc(documentRef);
};

const getSnapshotWorldMeta = (
  doc: QueryDocumentSnapshot<DocumentData>,
) => {
  const data = doc.data();
  const worldId =
    toStringSafe(data.worldId) ??
    toStringSafe(data.projectId) ??
    doc.id;
  const worldTitle =
    toStringSafe(data.worldTitle) ??
    toStringSafe(data.worldName) ??
    toStringSafe(data.projectTitle) ??
    worldId;

  return { worldId, worldTitle };
};

export const fetchTimelineHeatmapSnapshotsForOwners = async (
  ownerIds: string[],
): Promise<TimelineHeatmapSnapshotDocument[]> => {
  const firestore = getFirestore(firebaseApp);
  const historyCollection = collection(
    firestore,
    ...HISTORY_HEATMAP_COLLECTION_SEGMENTS,
  );

  const normalizedOwners = Array.from(
    new Set(
      ownerIds
        .map((owner) => owner.trim())
        .filter((owner): owner is string => owner.length > 0),
    ),
  );

  const documents: TimelineHeatmapSnapshotDocument[] = [];

  for (const ownerId of normalizedOwners) {
    const ownerQuery = query(historyCollection, where('ownerId', '==', ownerId));
    const snapshot = await getDocs(ownerQuery);
    snapshot.forEach((docSnapshot) => {
      const parsedTimelines = parseTimelineDocument(docSnapshot);
      const { worldId, worldTitle } = getSnapshotWorldMeta(docSnapshot);
      const data = docSnapshot.data();
      const rawTimelines = Array.isArray(data.timelines)
        ? data.timelines.map((timeline, index) =>
            normalizeTimelinePayload(
              timeline as TimelineHeatmapTimelinePayload,
              index,
            ),
          )
        : [];

      documents.push({
        id: docSnapshot.id,
        ownerId,
        worldId,
        worldTitle,
        timelines: rawTimelines,
        parsedTimelines,
        updatedAt: data.updatedAt,
      });
    });
  }

  return documents;
};

export const fetchSimulatedHistoryTimelines = async (
  ownerId: string,
): Promise<FirestoreTimelineHeatmapTimeline[]> => {
  const firestore = getFirestore(firebaseApp);
  const historyCollection = collection(
    firestore,
    ...HISTORY_HEATMAP_COLLECTION_SEGMENTS,
  );
  const historyQuery = query(historyCollection, where('ownerId', '==', ownerId));
  const snapshot = await getDocs(historyQuery);

  const timelines: FirestoreTimelineHeatmapTimeline[] = [];
  snapshot.forEach((doc) => {
    timelines.push(...parseTimelineDocument(doc));
  });

  return timelines;
};

export const buildTimelineArtifactsFromFirestore = (
  timelines: FirestoreTimelineHeatmapTimeline[],
) => {
  return timelines.map((timeline) => ({
    id: timeline.timelineId,
    ownerId: 'firestore-snapshot',
    projectId: timeline.worldId,
    type: ArtifactType.Timeline,
    title: timeline.timelineTitle,
    summary: '',
    status: 'imported',
    tags: [],
    relations: [],
    data: {
      events: timeline.events.map((event): TimelineEvent => ({
        id: event.id,
        title: event.title,
        date: event.date ?? '',
        description: event.description ?? '',
      })),
    } satisfies TimelineData,
  }));
};

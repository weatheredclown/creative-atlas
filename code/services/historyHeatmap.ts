import {
  collection,
  getDocs,
  getFirestore,
  QueryDocumentSnapshot,
  DocumentData,
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

export const fetchSimulatedHistoryTimelines = async (): Promise<FirestoreTimelineHeatmapTimeline[]> => {
  const firestore = getFirestore(firebaseApp);
  const historyCollection = collection(
    firestore,
    ...HISTORY_HEATMAP_COLLECTION_SEGMENTS,
  );
  const snapshot = await getDocs(historyCollection);

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

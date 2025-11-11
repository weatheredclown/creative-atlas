import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { firestore } from '../firebaseAdmin.js';

export interface FirestoreTimelineHeatmapEvent {
  id: string;
  title: string;
  date?: string;
  description?: string;
}

export interface FirestoreTimelineHeatmapTimeline {
  timelineId: string;
  timelineTitle: string;
  events: FirestoreTimelineHeatmapEvent[];
}

export interface FirestoreTimelineHeatmapSnapshot {
  id: string;
  ownerId: string;
  worldId: string;
  worldTitle: string;
  timelines: FirestoreTimelineHeatmapTimeline[];
}

export interface TimelineHeatmapEvent {
  id: string;
  title: string;
  date?: string;
  year: number | null;
  timelineId: string;
  timelineTitle: string;
}

export interface TimelineHeatmapCell {
  bucketStart: number;
  count: number;
  events: TimelineHeatmapEvent[];
}

export interface TimelineHeatmapRow {
  timelineId: string;
  timelineTitle: string;
  totalEvents: number;
  cells: TimelineHeatmapCell[];
}

export interface TimelineHeatmapBucket {
  start: number;
  end: number;
  label: string;
}

export interface TimelineHeatmapAggregation {
  worldId: string;
  worldTitle: string;
  bucketSpan: number;
  buckets: TimelineHeatmapBucket[];
  rows: TimelineHeatmapRow[];
  timelineCount: number;
  totalEvents: number;
  undatedEventCount: number;
  earliestYear: number | null;
  latestYear: number | null;
  maxCount: number;
}

const HISTORY_HEATMAP_COLLECTION = 'timelineHeatmap';
const HEATMAP_BUCKET_SPAN = 100;

const toStringSafe = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parseChronoValue = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const direct = Number.parseFloat(trimmed);
  if (!Number.isNaN(direct)) {
    return direct;
  }

  const iso = Date.parse(trimmed);
  if (!Number.isNaN(iso)) {
    return new Date(iso).getFullYear();
  }

  const match = trimmed.match(/-?\d{1,4}/);
  if (match) {
    const parsed = Number.parseInt(match[0] ?? '', 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return null;
};

const getCenturyLabel = (year: number): string => {
  const absolute = Math.abs(year);
  const centuryIndex = Math.floor((absolute + 99) / 100);
  const suffix = (() => {
    const remainder = centuryIndex % 100;
    if (remainder >= 11 && remainder <= 13) {
      return 'th';
    }
    switch (centuryIndex % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  })();

  if (year < 0) {
    return `${centuryIndex}${suffix} century BCE`;
  }

  return `${centuryIndex}${suffix} century`;
};

const buildHeatmapBuckets = (earliest: number, latest: number): TimelineHeatmapBucket[] => {
  const minStart = Math.floor(earliest / HEATMAP_BUCKET_SPAN) * HEATMAP_BUCKET_SPAN;
  const maxStart = Math.floor(latest / HEATMAP_BUCKET_SPAN) * HEATMAP_BUCKET_SPAN;
  const buckets: TimelineHeatmapBucket[] = [];

  for (let start = minStart; start <= maxStart; start += HEATMAP_BUCKET_SPAN) {
    const end = start + HEATMAP_BUCKET_SPAN - 1;
    buckets.push({
      start,
      end,
      label: getCenturyLabel(end),
    });
  }

  return buckets;
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
      const id =
        toStringSafe(event.id) ??
        toStringSafe(event.eventId) ??
        `${timelineKey}-event-${index + 1}`;
      const title = toStringSafe(event.title) ?? `Untitled event ${index + 1}`;
      const description = toStringSafe(event.description);
      const date = toStringSafe(event.date);

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
  doc: QueryDocumentSnapshot,
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

  return { timelineId, timelineTitle, events };
};

const parseTimelineDocument = (doc: QueryDocumentSnapshot): FirestoreTimelineHeatmapSnapshot | null => {
  const data = doc.data() ?? {};

  const worldId =
    toStringSafe((data as Record<string, unknown>).worldId) ??
    toStringSafe((data as Record<string, unknown>).projectId) ??
    doc.id;
  const worldTitle =
    toStringSafe((data as Record<string, unknown>).worldTitle) ??
    toStringSafe((data as Record<string, unknown>).worldName) ??
    toStringSafe((data as Record<string, unknown>).projectTitle) ??
    worldId;

  const timelineSources =
    Array.isArray((data as Record<string, unknown>).timelines)
      ? ((data as Record<string, unknown>).timelines as unknown[])
      : Array.isArray((data as Record<string, unknown>).timelineSnapshots)
        ? ((data as Record<string, unknown>).timelineSnapshots as unknown[])
        : Array.isArray((data as Record<string, unknown>).timelineHeatmap)
          ? ((data as Record<string, unknown>).timelineHeatmap as unknown[])
          : null;

  const timelines: FirestoreTimelineHeatmapTimeline[] = [];

  if (Array.isArray(timelineSources)) {
    timelineSources.forEach((entry, index) => {
      const timeline = parseTimelineEntry(doc, entry, index);
      if (timeline) {
        timelines.push(timeline);
      }
    });
  } else {
    const events = parseEvents(
      (data as Record<string, unknown>).events ??
        (data as Record<string, unknown>).timelineEvents ??
        (data as Record<string, unknown>).beats ??
        [],
      `${doc.id}-direct`,
    );

    if (events.length > 0) {
      timelines.push({
        timelineId: toStringSafe((data as Record<string, unknown>).timelineId) ?? doc.id,
        timelineTitle: toStringSafe((data as Record<string, unknown>).timelineTitle) ?? toStringSafe((data as Record<string, unknown>).title) ?? doc.id,
        events,
      });
    }
  }

  return {
    id: doc.id,
    ownerId: toStringSafe((data as Record<string, unknown>).ownerId) ?? 'unknown-owner',
    worldId,
    worldTitle,
    timelines,
  };
};

export const fetchTimelineHeatmapSnapshots = async (
  ownerId: string,
): Promise<FirestoreTimelineHeatmapSnapshot[]> => {
  const snapshot = await firestore
    .collection(HISTORY_HEATMAP_COLLECTION)
    .where('ownerId', '==', ownerId)
    .get();

  const documents: FirestoreTimelineHeatmapSnapshot[] = [];

  snapshot.forEach((doc) => {
    const parsed = parseTimelineDocument(doc);
    if (parsed) {
      documents.push(parsed);
    }
  });

  return documents;
};

export const buildTimelineHeatmapAggregation = (
  snapshot: FirestoreTimelineHeatmapSnapshot,
): TimelineHeatmapAggregation => {
  const timelineCount = snapshot.timelines.length;
  const allEvents = snapshot.timelines.flatMap((timeline) =>
    timeline.events.map((event): TimelineHeatmapEvent => ({
      id: event.id,
      title: event.title,
      date: event.date,
      year: parseChronoValue(event.date),
      timelineId: timeline.timelineId,
      timelineTitle: timeline.timelineTitle,
    })),
  );

  const totalEvents = allEvents.length;
  const datedEvents = allEvents.filter((event) => event.year !== null) as Array<
    TimelineHeatmapEvent & { year: number }
  >;

  if (datedEvents.length === 0) {
    return {
      worldId: snapshot.worldId,
      worldTitle: snapshot.worldTitle,
      bucketSpan: HEATMAP_BUCKET_SPAN,
      buckets: [],
      rows: snapshot.timelines.map((timeline) => ({
        timelineId: timeline.timelineId,
        timelineTitle: timeline.timelineTitle,
        totalEvents: 0,
        cells: [],
      })),
      timelineCount,
      totalEvents,
      undatedEventCount: totalEvents,
      earliestYear: null,
      latestYear: null,
      maxCount: 0,
    } satisfies TimelineHeatmapAggregation;
  }

  const earliestYear = datedEvents.reduce(
    (min, event) => Math.min(min, event.year),
    datedEvents[0]!.year,
  );
  const latestYear = datedEvents.reduce(
    (max, event) => Math.max(max, event.year),
    datedEvents[0]!.year,
  );

  const buckets = buildHeatmapBuckets(earliestYear, latestYear);
  const bucketIndex = new Map(buckets.map((bucket) => [bucket.start, bucket]));

  const rows = snapshot.timelines.map((timeline) => ({
    timelineId: timeline.timelineId,
    timelineTitle: timeline.timelineTitle,
    totalEvents: 0,
    cells: buckets.map((bucket) => ({
      bucketStart: bucket.start,
      count: 0,
      events: [] as TimelineHeatmapEvent[],
    })),
  }));

  const rowIndex = new Map(rows.map((row) => [row.timelineId, row]));
  let maxCount = 0;

  datedEvents.forEach((event) => {
    const bucketStart = Math.floor(event.year / HEATMAP_BUCKET_SPAN) * HEATMAP_BUCKET_SPAN;
    const bucket = bucketIndex.get(bucketStart);
    const row = rowIndex.get(event.timelineId);
    if (!bucket || !row) {
      return;
    }

    const cell = row.cells.find((candidate) => candidate.bucketStart === bucket.start);
    if (!cell) {
      return;
    }

    cell.count += 1;
    cell.events.push(event);
    row.totalEvents += 1;
    if (cell.count > maxCount) {
      maxCount = cell.count;
    }
  });

  return {
    worldId: snapshot.worldId,
    worldTitle: snapshot.worldTitle,
    bucketSpan: HEATMAP_BUCKET_SPAN,
    buckets,
    rows,
    timelineCount,
    totalEvents,
    undatedEventCount: totalEvents - datedEvents.length,
    earliestYear,
    latestYear,
    maxCount,
  } satisfies TimelineHeatmapAggregation;
};


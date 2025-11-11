import { describe, expect, it, vi } from 'vitest';

vi.mock('../../firebaseAdmin.js', () => ({
  firestore: {
    collection: vi.fn(),
  },
}));

// The aggregation util import must come after the mocks so Firestore is never initialized.
import {
  buildTimelineHeatmapAggregation,
  type FirestoreTimelineHeatmapSnapshot,
} from '../historyHeatmap.js';

describe('buildTimelineHeatmapAggregation', () => {
  const snapshot: FirestoreTimelineHeatmapSnapshot = {
    id: 'snapshot-1',
    ownerId: 'owner-123',
    worldId: 'world-42',
    worldTitle: 'Dustlands',
    timelines: [
      {
        timelineId: 'tl-alpha',
        timelineTitle: 'Founding Years',
        events: [
          { id: 'event-1', title: 'Settlement chartered', date: '120 CE' },
          { id: 'event-2', title: 'An oral tale is told' },
        ],
      },
      {
        timelineId: 'tl-beta',
        timelineTitle: 'Flux Cycle',
        events: [{ id: 'event-3', title: 'Verdant comet returns', date: '250 CE' }],
      },
    ],
  };

  it('buckets timeline events by century and tracks undated entries', () => {
    const aggregation = buildTimelineHeatmapAggregation(snapshot);

    expect(aggregation.worldId).toBe('world-42');
    expect(aggregation.worldTitle).toBe('Dustlands');
    expect(aggregation.bucketSpan).toBe(100);
    expect(aggregation.buckets.map((bucket) => bucket.start)).toEqual([100, 200]);
    expect(aggregation.totalEvents).toBe(3);
    expect(aggregation.undatedEventCount).toBe(1);
    expect(aggregation.earliestYear).toBe(120);
    expect(aggregation.latestYear).toBe(250);
    expect(aggregation.maxCount).toBe(1);

    const alphaRow = aggregation.rows.find((row) => row.timelineId === 'tl-alpha');
    const betaRow = aggregation.rows.find((row) => row.timelineId === 'tl-beta');

    expect(alphaRow?.totalEvents).toBe(1);
    expect(
      alphaRow?.cells.map((cell) => ({ start: cell.bucketStart, count: cell.count })),
    ).toEqual([
      { start: 100, count: 1 },
      { start: 200, count: 0 },
    ]);

    expect(betaRow?.totalEvents).toBe(1);
    expect(
      betaRow?.cells.map((cell) => ({ start: cell.bucketStart, count: cell.count })),
    ).toEqual([
      { start: 100, count: 0 },
      { start: 200, count: 1 },
    ]);

    const populatedCell = betaRow?.cells.find((cell) => cell.count === 1);
    expect(populatedCell?.events[0]?.title).toBe('Verdant comet returns');
  });
});


import { Router } from 'express';
import { z } from 'zod';
import { authenticate, type AuthenticatedRequest } from '../middleware/authenticate.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  buildTimelineHeatmapAggregation,
  fetchTimelineHeatmapSnapshots,
} from '../utils/historyHeatmap.js';

const router = Router();

router.use(authenticate);

const querySchema = z.object({
  worldId: z.string().min(1).optional(),
});

router.get(
  '/heatmap',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parseResult = querySchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid request parameters',
        details: parseResult.error.flatten(),
      });
      return;
    }

    const ownerId = req.user?.uid;
    if (!ownerId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const snapshots = await fetchTimelineHeatmapSnapshots(ownerId);
    const { worldId } = parseResult.data;

    const filtered = worldId
      ? snapshots.filter((snapshot) => snapshot.worldId === worldId)
      : snapshots;

    const aggregations = filtered.map((snapshot) => ({
      snapshotId: snapshot.id,
      ...buildTimelineHeatmapAggregation(snapshot),
    }));

    res.json({
      ownerId,
      worlds: aggregations,
      generatedAt: new Date().toISOString(),
    });
  }),
);

export default router;


# Simulated History Heatmap Overview

The simulated history heatmap summarizes timeline documents that collaborators publish to the `timelineHeatmap` Firestore collection. Each snapshot groups multiple timelines from a world and includes their dated events. The backend aggregation utilities normalize those snapshots, convert event dates into centuries, and tally per-century counts so the UI can render heatmap cells.

## Data Flow

1. **Firestore snapshots** — Collaborators publish snapshot documents under `timelineHeatmap`. Each document stores the owner, world metadata, and one or more timelines with their events.
2. **Aggregation utilities** — `server/src/utils/historyHeatmap.ts` parses the snapshot documents, normalizes event metadata, and converts event dates into 100-year buckets. Missing or malformed data is tolerated so legacy exports still participate in the visualization.
3. **API endpoint** — `/api/history/heatmap` retrieves snapshots for the signed-in collaborator, optionally filters by world, and returns the aggregated heatmap payload.
4. **Frontend visualization** — The React heatmap component (under `code/src/features/history/`) consumes the aggregated payload to render a world timeline heatmap with optional world/era filters.

## Purpose of the Task

Segment B of the automation roadmap tracks work that deepens Creative Atlas features. The simulated history heatmap task exists to:

- Give collaborators a quick overview of historical activity density across their worlds.
- Highlight undated or sparsely dated events so teams can fill timeline gaps.
- Provide a foundation for future analytics, such as comparing timelines or filtering by eras.

Completing this task requires wiring the frontend visualization to the aggregation endpoint and ensuring the experience degrades gracefully when Firestore access is unavailable.

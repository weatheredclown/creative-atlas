# Simulated History Heatmap Overview

The simulated history heatmap summarizes the timeline artifacts already stored in the active project. Timeline events are parsed for numeric years, bucketed into centuries, and tallied so the UI can render a density table alongside the undated event count. Because the data is derived directly from the workspace, no Firestore snapshots, admin tooling, or additional API endpoints are required.

## Data Flow

1. **Workspace artifacts** — The world simulation panel passes the current project’s timeline artifacts to the heatmap component.
2. **Heatmap builder** — `buildSimulatedHistoryHeatmap` (in `code/utils/worldSimulation.ts`) parses each event, extracts numbers from the `date` string when possible, maps them into 100-year buckets, and tallies totals plus undated counts.
3. **Frontend visualization** — `code/features/history/SimulatedHistoryHeatmap.tsx` renders the bucketed data, optional era filters, and helper text prompting creators to add explicit years when events cannot be parsed.

## Purpose of the Task

The history heatmap lives inside the World Simulation panel so creators can:

- See which portions of their project’s history are densely recorded versus empty.
- Spot undated or sparsely dated events that need additional chronology.
- Filter down to specific centuries without juggling multiple timeline editors.

Because it now reflects only the signed-in user’s project data, the experience is deterministic, easier to explain, and free of cross-project normalization issues.

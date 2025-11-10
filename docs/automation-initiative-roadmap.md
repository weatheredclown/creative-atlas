# Automation Initiative Roadmap

This document tracks the multi-session automation initiative to deliver the full Creative Atlas experience. Each bullet is an actionable deliverable. When a task is completed, delete the bullet entirely so the roadmap trends toward an empty file.

## Usage Notes
- Always update this roadmap before ending a work session so the next agent inherits an accurate state snapshot.
- Prefer small, verifiable tasks. If a task balloons, split it into sub-bullets and keep only the next actionable slice here.
- Add links to relevant docs, designs, or code modules so future agents can jump straight into implementation.

## Segment A — Infrastructure & Robustness
- Harden Gemini proxying: introduce a backend proxy in `server/` that forwards AI requests, redacts secrets, and documents required env vars.
- Implement resilient collaboration primitives: decide on the shared editing model, then scaffold WebSocket/CRDT support under `server/src/collaboration/` with optimistic UI hooks in `code/src/`.
- Ship offline caching: persist drafts locally (IndexedDB or browser storage) and add background sync queues so editors function during outages.
- Validate imports on the server: move CSV/Markdown parsing into Express handlers, returning structured validation errors to the frontend.
- Surface GitHub publish job status endpoints so the UI can report progress and outcomes for the static site deployment flow. (Repo picker now uses the data API with authenticated requests; wire up backend status endpoints next.)
  - Resolved ESLint regressions in `code/hooks/useGitHubPublish.ts` so the GitHub publish flow stays unblocked while backend status endpoints are still pending.
- Add a static analysis guard (custom ESLint rule or TypeScript check) that rejects `import type` usage for runtime enums like `ArtifactType` to prevent regressions similar to the recent production crash. (Hotfixed the immediate regression by switching `utils/artifactMetrics.ts` back to a value import; guard still needed.)

## Segment B — Feature Depth & Design Polish
- Build the simulated history heatmap: aggregate timeline data in Firestore and render a heatmap visualization in `code/src/features/history/`.
  - ✅ Expose an admin timeline snapshot publisher that seeds collaborator documents in the `timelineHeatmap` collection.
- Deliver character arc tooling: family tree visualizations now support multi-parent households (duplicate child rendering fixed); next add progression state overlays and sync them with the relationship graph.
- Wire the simulated history heatmap in `code/features/history/SimulatedHistoryHeatmap.tsx` to Firestore timeline data and add filters for worlds/eras.
- Ship the simulated history heatmap: aggregate timeline data in Firestore and render the visualization in `code/src/features/history/SimulatedHistoryHeatmap.tsx` with filters for worlds/eras.
  - Draft the Firestore aggregation (REST endpoint or callable function) that buckets timeline events for consumption by the heatmap component.
  - Connect the heatmap UI to the new aggregation source and expose world/era filters in the panel UI.
  - ✅ Skip Firestore reads when the viewer is in guest mode or unauthenticated so the UI relies on local project data without triggering permission errors.
  - ✅ Gracefully handle Firestore permission denials by falling back to local timeline data without logging hard errors.
- Deliver character arc tooling: family tree visualizations and creation flows now connect from character sheets and the tree itself; progression states need to surface across the graph.
  - Define the progression state schema (status enums, timestamps) shared between character sheets and the relationship graph data model.
  - Render progression overlays within the family tree and ensure the relationship graph consumes the shared state without duplication.
- Streamline artifact relation linking in the workspace: design and implement multi-select linking with grouped relation types to reduce repetitive scrolling.
- Create procedural encounter generator: blend Dustland and PIT lore to output encounters; expose controls in the quest builder UI.
- Expand export formats: support Dustland ACK, D&D cards, visual novel scenes, scripts, and auto-generated character sheets/campaign packets.
- Implement canon enforcement workflows: add NPC memory mode, truth/canon lock approvals, and lore distillation pipelines.
- Align artifact workspace header actions with the refreshed project overview layout so import/export controls and quick-fact capture live in a unified command shelf.
- App refactor: extracted artifact workflows into a dedicated `ProjectWorkspace` component, moving modal orchestration and quick fact flows out of `App.tsx`; next, break the workspace container into the planned hero/activity/modals subcomponents.
- Audit Atlas Intelligence blueprint outputs generated from lore briefs and extend scene/chapter templates with multi-beat outlines to match the richer skeletons now produced.

## Segment C — Tutorial & Education Experience
- Layer onboarding, accessibility, and localization improvements focused on first-time creators. (Tutorial popover now includes an explicit close button; continue auditing remaining tutorial interactions.)
- Produce support content: integrated FAQs, in-app documentation, and contextual tooltips that teach advanced features.

## Segment D — Compliance & Operations
- Formalize data retention, moderation, and privacy policies with enforcement hooks in backend services.
- Integrate analytics & monitoring: instrument key flows, set up alerting, and document operational runbooks.

## Segment E — Research & Sequencing Queue
- Document decisions required for collaboration scope (real-time vs. turn-based) and list dependencies before implementation begins.
- Capture the current template recommendation heuristic and outline enhancements for richer ranking.

When a segment is cleared, remove its heading entirely. If new priorities emerge, add them as new segments so the roadmap always reflects the next meaningful slices of work.

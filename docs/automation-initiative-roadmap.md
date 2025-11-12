# Automation Initiative Roadmap

This document tracks the multi-session automation initiative to deliver the full Creative Atlas experience. Each bullet is an actionable deliverable. When a task is completed, delete the bullet entirely so the roadmap trends toward an empty file.

## Usage Notes
- Always update this roadmap before ending a work session so the next agent inherits an accurate state snapshot.
- Prefer small, verifiable tasks. If a task balloons, split it into sub-bullets and keep only the next actionable slice here.
- Add links to relevant docs, designs, or code modules so future agents can jump straight into implementation.

## Segment A — Infrastructure & Robustness
- ✅ Frontend deployment pipeline now forwards `VITE_API_BASE_URL` from GitHub Actions variables so production builds receive the required configuration.
- ✅ CI workflow now exports `VITE_API_BASE_URL` so verification builds succeed without manual intervention.
- Implement resilient collaboration primitives: decide on the shared editing model, then scaffold WebSocket/CRDT support under `server/src/collaboration/` with optimistic UI hooks in `code/src/`.
- Ship offline caching: persist drafts locally (IndexedDB or browser storage) and add background sync queues so editors function during outages.
- Validate imports on the server: move CSV/Markdown parsing into Express handlers, returning structured validation errors to the frontend.
- Surface GitHub publish job status endpoints so the UI can report progress and outcomes for the static site deployment flow. (Repo picker now uses the data API with authenticated requests; wire up backend status endpoints next.)
  - Resolved ESLint regressions in `code/hooks/useGitHubPublish.ts` so the GitHub publish flow stays unblocked while backend status endpoints are still pending.
- Add regression coverage for artifact normalization so partial records from the data API never crash the workspace editors.
  - ✅ Artifact detail panel now tolerates malformed tag and relation arrays and defaults missing project artifact collections so workspace editors stay stable when wiki payloads arrive incomplete.
  - ✅ Artifact filter hook now tolerates artifacts missing tag arrays so wiki selections don't crash the explorer.
  - ✅ Workspace artifact list view now renders as card markup with keyboard support, eliminating `<tr>` hydration crashes in guest mode.
  - Error boundary now offers a recovery button that coerces malformed artifact payloads into safe editor defaults; add coverage that exercises the new UI flow with corrupted wiki content.
  - ✅ Kanban board normalizes missing task states so workspace cards stay visible when tasks lack a stored status.

## Segment B — Feature Depth & Design Polish
- Deliver character arc tooling: family tree visualizations now support multi-parent households (duplicate child rendering fixed) and share stage overlays with the relationship graph; next expose stage filters so editors can spotlight characters by arc state.
- Deliver character arc tooling: family tree visualizations and creation flows now connect from character sheets and the tree itself; progression states need to surface across the graph.
  - ✅ Family tree tools now display progression badges derived from shared arc analysis so stage overlays are consistent with the tracker.
  - ✅ Rendered progression overlays within the family tree and ensured the relationship graph consumes the shared state without duplication.
  - Introduce stage filters in the graph view so editors can spotlight characters in a specific arc phase.
- ✅ Persist manual graph view layouts so dragged artifact positions survive reloads and future sessions.
- Expand export formats: support Dustland ACK, D&D cards, visual novel scenes, scripts, and auto-generated character sheets/campaign packets.
- Implement canon enforcement workflows: add NPC memory mode, truth/canon lock approvals, and lore distillation pipelines.
  - Added NPC memory sync scope filters, Firestore NPC run API, and World Simulation surfacing of canon risk. Follow-up: wire in truth-lock approvals and lore distillation cues.
- Align artifact workspace header actions with the refreshed project overview layout so import/export controls and quick-fact capture live in a unified command shelf.
- Address the usability fixes outlined in `docs/usability-improvement-tips.md`:
  - Refine artifact detail panel tabs with clear labelling and full keyboard support.
  - Layer guidance into Graph view and Family Tree tools so linking workflows feel discoverable.
  - Keep workspace context persistent after saves and surface confirmation toasts instead of full reloads.
  - Provide inline help for advanced AI modules and audit accessibility/responsiveness gaps.
- App refactor: extracted artifact workflows into a dedicated `ProjectWorkspace` component, moving modal orchestration and quick fact flows out of `App.tsx`; hero, artifact, activity, and modal subcomponents now live under `code/components/workspace/`.
  - ✅ Quick fact capture launched from artifact rows now anchors the saved fact to the selected artifact via automatic relations and contextual prompts.
  - Assess breaking `WorkspaceArtifactPanel.tsx` into smaller editors if follow-up work continues to grow the file.
  - Add component-level tests for artifact filters, activity panel toggles, and modal wiring to cover the new structure.
- Audit Atlas Intelligence blueprint outputs generated from lore briefs and extend scene/chapter templates with multi-beat outlines to match the richer skeletons now produced.
  - ✅ Introduced a workspace content picker for Atlas Intelligence prompt slots so creators can insert project, artifact, and milestone IDs without leaving the flow.
  - ✅ Atlas Intelligence fallback responses now replace workspace IDs with human-readable artifact and project labels so offline drafts stay readable.
  - ✅ Removed Atlas Intelligence fallback prose so Gemini failures surface clear errors, making misconfigurations easier to diagnose.
  - ➕ Dialogue Forge scene generator lets creators feed a prompt and selected characters to Atlas Intelligence and receive structured dialogue with beat suggestions; wire its outputs into scene templates and exports next.
    - Added prompt length guards so Dialogue Forge trims lengthy bios, prompts, and beats before sending Gemini requests.
    - Widened the Dialogue Forge prompt budget so prompts (2.6k chars, up from 1.2k), summaries (2k, up from 1.2k), beats (3k shared across up to 10 beats instead of 1.2k apiece), and cast bios (3.4k shared, up from 400-character snippets) can reach Gemini without triggering the oversized-request error.
  - Gemini prompt builder now injects project, artifact, and milestone context into Gemini requests so Atlas Intelligence returns grounded drafts; next, extend the scene/chapter template renderer to surface the richer outlines directly in the workspace editors.

## Segment F — Simulated History Heatmap
- Build the simulated history heatmap: aggregate timeline data in Firestore and render a heatmap visualization in `code/src/features/history/`. (Scope and data flow summarized in `docs/history-heatmap-overview.md`.)
  - ✅ Expose an admin timeline snapshot publisher that seeds collaborator documents in the `timelineHeatmap` collection.
- Wire the simulated history heatmap in `code/features/history/SimulatedHistoryHeatmap.tsx` to Firestore timeline data and add filters for worlds/eras.
- Ship the simulated history heatmap: aggregate timeline data in Firestore and render the visualization in `code/src/features/history/SimulatedHistoryHeatmap.tsx` with filters for worlds/eras.
  - Connect the heatmap UI to the new aggregation source and expose world/era filters in the panel UI.
  - ✅ Skip Firestore reads when the viewer is in guest mode or unauthenticated so the UI relies on local project data without triggering permission errors.
  - ✅ Gracefully handle Firestore permission denials by falling back to local timeline data without logging hard errors.

## Segment C — Tutorial & Education Experience
- Layer onboarding, accessibility, and localization improvements focused on first-time creators. (Tutorial popover now includes an explicit close button; continue auditing remaining tutorial interactions.)
  - ✅ Bilingual tutorial copy now respects an `?hl=` query parameter (replacing the dropdown selector) while keeping screen-reader-friendly step status messaging.
  - ✅ Expand localization to contextual tooltips and onboarding banners that appear outside the tutorial popover.
- Produce support content: integrated FAQs, in-app documentation, and contextual tooltips that teach advanced features.

## Segment D — Compliance & Operations
- ✅ Integrate analytics & monitoring: instrument key flows, set up alerting, and document operational runbooks.

## Segment E — Research & Sequencing Queue
- Document decisions required for collaboration scope (real-time vs. turn-based) and list dependencies before implementation begins.
- Capture the current template recommendation heuristic and outline enhancements for richer ranking.

When a segment is cleared, remove its heading entirely. If new priorities emerge, add them as new segments so the roadmap always reflects the next meaningful slices of work.

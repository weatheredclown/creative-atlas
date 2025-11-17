# Automation Initiative Roadmap

This document tracks the multi-session automation initiative to deliver the full Creative Atlas experience. Each bullet is an actionable deliverable. When a task is completed, delete the bullet entirely so the roadmap trends toward an empty file.

## Usage Notes
- Always update this roadmap before ending a work session so the next agent inherits an accurate state snapshot.
- Prefer small, verifiable tasks. If a task balloons, split it into sub-bullets and keep only the next actionable slice here.
- Add links to relevant docs, designs, or code modules so future agents can jump straight into implementation.

## Not Done

### Stability & Reliability (Protect the Experience)
- **Implement resilient collaboration primitives.**
  - _Context:_ Collaboration gateway scaffolding now lives under `server/src/collaboration/` with an in-memory adapter wired into the Express app, and WebSocket transport bridges sessions to connected clients.
  - _Next actions:_
    - [ ] Thread CRDT-aware operations through the adapter and persist them to a durable store (start with a Firestore-backed adapter in `server/src/collaboration/adapters/firestoreAdapter.ts`).
    - [ ] Add optimistic UI hooks in `code/src/` so editors can apply CRDT patches locally before the server ACK.
- **Add regression coverage for artifact normalization.**
  - _Context:_ The error boundary now offers a recovery button that coerces malformed artifact payloads into safe editor defaults.
  - _Next actions:_
    - [ ] Create corrupted wiki fixture payloads under `code/test/fixtures/`.
    - [ ] Write UI tests that click the recovery button and verify the editors continue functioning.
- **Document collaboration scope decisions.**
  - _Context:_ Real-time collaboration blockers remain hazy.
  - _Next action:_ Capture a short design note summarizing the decision tree (real-time vs. turn-based, dependency list) and link it here before deeper implementation work starts.
- **Low-priority backlog (keep at the bottom):**
  - [ ] Ship offline caching: persist drafts locally (IndexedDB or browser storage) and add background sync queues so editors function during outages.
  - [ ] Validate imports on the server by moving CSV/Markdown parsing into Express handlers and surfacing structured validation errors in the frontend.

### Interoperability & Collaboration (Connect People & Tools)
- **Ghost automation agent macros + UI exposure.**
  - _Context:_ `/api/agent/step` brokers Gemini 2.5 computer-use responses to the in-app ghost UI, retains action history, and already threads reusable macro definitions from `server/src/routes/agentMacros.ts` into the prompt. Operators still trigger macros indirectly.
  - _Next actions:_
    - [ ] Surface macro selections inside the ghost agent client so operators can trigger macros explicitly (hook into `code/components/AgentPanel/`).
    - [ ] Add regression coverage so tool config changes (e.g., reintroducing `allowedFunctionNames`) fail fast before hitting the Gemini API.
- **Ghost agent context & preview ergonomics.**
  - _Context:_ The payload preview modal now behaves as a draggable floating window, and the ghost agent prompt includes project context (title, summary, artifact mix, highlights).
  - _Next actions:_
    - [ ] Add a client-side setting that lets operators opt out of auto-opening the payload preview during long runs.
    - [ ] Surface the currently focused artifact and unsaved edits inside the prompt once that state is exposed from the workspace UI.
- **Coordinate normalization, calibration, and screenshot reliability.**
  - _Context:_ Viewport coordinate scaling and Y-axis calibration now align the 0-1000 grid with DOM targets, dialog capture keeps modals visible, and an in-app calibration mode logs cursor offsets with manual reset + debug toggles.
  - _Next actions:_
    - [ ] Log sampled coordinate translations server-side to validate heuristics before expanding macro coverage.
    - [ ] Persist aggregated calibration metrics (including the selected transform model) to the backend so operators can compare drift across sessions.
    - [ ] Confirm the ghost agent can submit sequential feedback with screenshots attached using the updated dialog capture flow, and expose the loaded `html2canvas` helper via documentation so operators can debug capture failures.
- **Canon enforcement workflows.**
  - _Context:_ NPC memory sync scope filters, Firestore NPC run API, and World Simulation surfacing of canon risk are live.
  - _Next actions:_
    - [ ] Wire in truth-lock approvals and lore distillation cues (start with workflow stubs in `code/components/canon/`).
- **Dialogue Forge export integration.**
  - _Context:_ `/api/ai/dialogue/scene` assembles prompts, enforces Gemini safety checks, and returns structured dialogue. Dialogue Forge previews render inside the shared project view, prompt trimming/length guards are in place, and the prompt builder injects project/artifact context.
  - _Next actions:_
    - [ ] Extend scene/chapter template renderers to surface the richer outlines directly in the workspace editors (`code/components/workspace/templates/`).
    - [ ] Extend export flows so Dialogue Forge transcripts ride along with scene exports.
- **Low-priority backlog (keep at the bottom):**
  - [ ] Implement canon enforcement NPC memory mode enhancements flagged above once higher-priority automation work is stable.

### Content Creation & Expansion (Build More, Faster)
- **Gemini-driven Nano Banana prompts + endpoint.**
  - _Context:_ `/api/projects/:id/nano-banana/generate` now builds Gemini image prompts from project metadata (title, summary, tags, art mode) so thumbnails reflect canon instead of raw user text, and server-side rate limits (50 per user/day) keep the flow from turning into a general-purpose image generator.
  - _Next actions:_
    - [ ] Cache Gemini-rendered thumbnails alongside the existing deterministic canvas fallback so social shares load instantly.
- **Character arc tooling (family tree + graph).**
  - _Context:_ Family tree visualizations share stage overlays with the relationship graph, creation flows connect from sheets and the tree, and the Graph view now includes an Arc Stage Spotlight filter with summaries.
  - _Next actions:_
    - [ ] Persist the selected stage filter and add unit coverage for the filtering logic.
    - [ ] Expose the same guidance inside the Family Tree tools.
- **Character arc progression state surfacing.**
  - _Context:_ Quick fact capture improvements and shared progression calculations are live.
  - _Next action:_ Introduce additional stage filters so editors can spotlight characters in a specific arc phase and reflect the progression state everywhere the family tree graph renders.
- **Project workspace refactor follow-ups.**
  - _Context:_ Artifact workflows now live inside the `ProjectWorkspace` component with hero, artifact, activity, and modal subcomponents relocated under `code/components/workspace/`.
  - _Next actions:_
    - [ ] Break `WorkspaceArtifactPanel.tsx` into smaller editors if continued growth warrants.
    - [ ] Add component-level tests for artifact filters, activity panel toggles, and modal wiring.
- **Dialogue Forge prompt budget + template rendering.**
  - _Context:_ Prompt budgets widened (prompts: 2.6k chars, summaries: 2k, beats: 3k shared, bios: 3.4k shared) and sanitization handles empty speaker/direction fields.
  - _Next action:_ Extend the scene/chapter template renderer to surface the richer outlines directly in the workspace editors (share work with the export integration above to avoid divergence).
- **Low-priority backlog (keep at the bottom):**
  - [ ] Expand export formats: Dustland ACK, D&D cards, visual novel scenes, scripts, and auto-generated character sheets/campaign packets.
  - [ ] Audit Atlas Intelligence blueprint outputs generated from lore briefs and extend scene/chapter templates with multi-beat outlines.

### Reporting & Project Insights (Understand & Explore Work)
- **Workspace UX polish.**
  - _Context:_ Arc Stage Spotlight explainers now appear in the Graph view.
  - _Next actions:_
    - [x] Keep workspace context persistent by encoding the selected project in the workspace URL so reloads/bookmarks reopen the same context.
    - [ ] Surface confirmation toasts instead of full reloads.
    - [ ] Provide inline help for advanced AI modules and audit accessibility/responsiveness gaps.
    - [ ] Replicate the Arc Stage Spotlight guidance inside the Family Tree tools.
- **Low-priority backlog (keep at the bottom):**
  - [ ] Align artifact workspace header actions with the refreshed project overview layout.
- _(Low priority)_ Build the simulated history heatmap: aggregate timeline data in Firestore and render a heatmap visualization in `code/src/features/history/`. (Scope and data flow summarized in `docs/history-heatmap-overview.md`.)
- _(Low priority)_ Wire the simulated history heatmap in `code/features/history/SimulatedHistoryHeatmap.tsx` to Firestore timeline data and add filters for worlds/eras.
  - ✅ World filters now distinguish between local timelines and remote Firestore snapshots, exposing a dedicated "current project" option; next, surface per-world counts and persist filter choices between sessions.
- _(Low priority)_ Ship the simulated history heatmap: aggregate timeline data in Firestore and render the visualization in `code/src/features/history/SimulatedHistoryHeatmap.tsx` with filters for worlds/eras.
  - Connect the heatmap UI to the new aggregation source and expose world/era filters in the panel UI.

### Workflow Efficiency & Usability (Smoother Everyday Editing)
- Address the usability fixes outlined in `docs/usability-improvement-tips.md`:
  - Refine artifact detail panel tabs with clear labelling and full keyboard support.
  - Layer guidance into Graph view and Family Tree tools so linking workflows feel discoverable.
  - Keep workspace context persistent after saves and surface confirmation toasts instead of full reloads.
  - Provide inline help for advanced AI modules and audit accessibility/responsiveness gaps.
  - ✅ The Graph view now opens with an Arc Stage Spotlight explainer and counts, guiding editors toward the new filtering workflow; next, replicate the guidance inside the Family Tree tools.
- Align artifact workspace header actions with the refreshed project overview layout so import/export controls and quick-fact capture live in a unified command shelf.

### Onboarding & Education (Help New Creators Succeed)
- Layer onboarding, accessibility, and localization improvements focused on first-time creators. (Tutorial popover now includes an explicit close button.)
  - _Next actions:_
    - [ ] Continue auditing tutorial interactions for accessibility issues.
    - [ ] Render the FAQ entries in `code/src/data/supportFaqs.ts` inside the support drawer.
- Produce support content: integrated FAQs, in-app documentation, and contextual tooltips that teach advanced features.
- **Low-priority backlog (keep at the bottom):**
  - [ ] Produce additional localization assets once core onboarding tasks stabilize.

### Operational Excellence & Compliance (Keep Operations Running)
- **GitHub publish job status + modal feedback (single source of truth).**
  - _Context:_ Repo picker uses the data API with authenticated requests, the publish modal surfaces validation failures inline, ESLint regressions in `code/hooks/useGitHubPublish.ts` were resolved, and `/api/github/publish/status/:jobId` returns queued/running/succeeded/failed metadata.
  - _Next actions:_
    - [ ] Persist status records beyond process restarts (extend the status model in `server/src/routes/github/publishStatus.ts`).
    - [ ] Stream updates to the client so the modal can expose queued/running states without polling.
    - [ ] Surface queued/running states inside the modal UI using the unwrapped job results.
- **Firebase Hosting deploy stability.**
  - _Context:_ `/share/**` rewrite replaced with the `shareMetadata` Cloud Function proxy; CI deploys now co-deploy the function, run from `${GITHUB_WORKSPACE}`, and shell out to `firebase deploy --only hosting --except extensions`. Share metadata deploys reuse the same credentials, and the Hosting workflows now pin `firebase-tools` v14.25.0. Postinstall hooks ensure `firebase-functions` installs before deploy analysis.
  - _Next actions:_
    - [ ] Monitor the proxy for latency/quota regressions and backfill tests covering representative share payloads.
    - [ ] Confirm upcoming merge + preview runs stay stable before re-enabling additional deploy targets.
    - [ ] Keep the documentation in sync if further automation (e.g., emulator smoke tests) is added.
  - _Low priority cleanup:_ Capture the current template recommendation heuristic and outline enhancements for richer ranking once deploy stability is confirmed.
- **Investigate Firebase Hosting deploy instability follow-ups.**
  - _Context:_ Frontend dependency installs now trigger the Cloud Function `postinstall` hook so `firebase-functions` is available before `firebase deploy` analyzes triggers, and the CI workflow explicitly installs function dependencies.
  - _Next action:_ Continue monitoring workflows to ensure the bootstrap flow remains stable before adding emulator smoke tests.

## Done

### Stability & Reliability (Protect the Experience)
- ✅ Firebase Hosting now rewrites `/share/**` to the App Engine default service so share metadata deploys without requiring Cloud Run.
- ✅ Frontend deployment pipeline now forwards `VITE_API_BASE_URL` from GitHub Actions variables so production builds receive the required configuration.
- ✅ CI workflow now exports `VITE_API_BASE_URL` so verification builds succeed without manual intervention.
- ✅ Artifact detail panel now tolerates malformed tag and relation arrays and defaults missing project artifact collections so workspace editors stay stable when wiki payloads arrive incomplete.
- ✅ Artifact filter hook now tolerates artifacts missing tag arrays so wiki selections don't crash the explorer.
- ✅ Workspace artifact list view now renders as card markup with keyboard support, eliminating `<tr>` hydration crashes in guest mode.
- ✅ Kanban board normalizes missing task states so workspace cards stay visible when tasks lack a stored status.

### Interoperability & Collaboration (Connect People & Tools)
- ✅ Hardened the `/api/agent/step` Gemini request by attaching the Computer Use tool and a custom `ghost_agent_action` function so the API no longer returns 400 errors when the ghost agent runs.
- ✅ Corrected the agent prompt template so the TypeScript build succeeds after recent string interpolation edits.
- ✅ Removed the unsupported `allowedFunctionNames` tool config so the Gemini computer-use model accepts ghost agent requests again.
- ✅ Replaced the generic action schema with explicit click/type/scroll/ask/done tools, instructing the model on the 1000x1000 grid and scaling coordinates to the live viewport.

### Content Creation & Expansion (Build More, Faster)
- ✅ Family tree tools now display progression badges derived from shared arc analysis so stage overlays are consistent with the tracker.
- ✅ Rendered progression overlays within the family tree and ensured the relationship graph consumes the shared state without duplication.
- ✅ Character progression metrics are now computed once in the workspace container and reused across the family tree and graph views to prevent drift.
- ✅ Quick fact capture launched from artifact rows now anchors the saved fact to the selected artifact via automatic relations and contextual prompts.
- ✅ Introduced a workspace content picker for Atlas Intelligence prompt slots so creators can insert project, artifact, and milestone IDs without leaving the flow.
- ✅ Atlas Intelligence fallback responses now replace workspace IDs with human-readable artifact and project labels so offline drafts stay readable.
- ✅ Removed Atlas Intelligence fallback prose so Gemini failures surface clear errors, making misconfigurations easier to diagnose.
- ✅ Nano Banana previews are now resized client-side before saving so Firestore updates no longer fail when Gemini returns larger PNGs.

### Reporting & Project Insights (Understand & Explore Work)
- ✅ Exposed an admin timeline snapshot publisher that seeds collaborator documents in the `timelineHeatmap` collection.
- ✅ Skip Firestore reads when the viewer is in guest mode or unauthenticated so the UI relies on local project data without triggering permission errors.
- ✅ Gracefully handle Firestore permission denials by falling back to local timeline data without logging hard errors.
- ✅ Pivoted the simulated history heatmap to use only local project timelines, removed the Firestore snapshot tooling/routes, and updated the docs to reflect the single-project scope.

### Workflow Efficiency & Usability (Smoother Everyday Editing)
- ✅ Artifact action menu now includes inline rename controls so workspace editors can retitle artifacts without leaving the detail view.
- ✅ Persisted manual graph view layouts so dragged artifact positions survive reloads and future sessions.
- ✅ Moved the Creative Atlas Agent trigger into the header action bar so it aligns with other workspace controls.
- ✅ Shared project links now surface App Engine-rendered Open Graph metadata so social unfurls display the project title, summary highlights, and a branded preview card instead of the generic "Creative Atlas" label.
- ✅ Artifact relation entries now act as navigation links so editors can jump between related artifacts without searching manually.
- ✅ Workspace section index links now use smooth scrolling with header offset awareness so hash navigation no longer triggers browser extension message-channel errors.
- ✅ Added a prominent skip navigation control so keyboard users can jump straight to the main workspace content without tabbing through header actions.

### Onboarding & Education (Help New Creators Succeed)
- ✅ Bilingual tutorial copy now respects an `?hl=` query parameter (replacing the dropdown selector) while keeping screen-reader-friendly step status messaging.
- ✅ Expanded localization to contextual tooltips and onboarding banners that appear outside the tutorial popover.

### Operational Excellence & Compliance (Keep Operations Running)
- ✅ Integrate analytics & monitoring: instrumented key flows, set up alerting, and documented operational runbooks.
- ✅ Resolved ESLint regressions in `code/hooks/useGitHubPublish.ts` so the GitHub publish flow stays unblocked while backend status endpoints are still pending.
- ✅ Pinned `firebase-tools` v14.25.0 in Hosting workflows so the App Engine share rewrite deploys without config validation failures.
- ✅ Firebase Hosting workflows now use `FirebaseExtended/action-hosting-deploy@v0.9.0` so deploys rely on the supported GitHub Action with app-aware hosting support.

## Session Log
- 2025-02-14: Resolved standalone achievements bug (World Builder unlock condition) and added regression tests; no roadmap items impacted.
- 2025-02-15: Documented deployment smoke test logging note in `README.md`; no roadmap items impacted.
- 2025-02-16: Added Creative Atlas art mode selector and multi-variant hero previews inside `ProjectOverview`; no roadmap bullets impacted.
- 2025-02-17: Updated GitHub publish tests to reflect job metadata response shape; no roadmap items impacted.
- 2025-11-16: Resolved Gemini safety typing regressions blocking the workspace route build; no roadmap bullets impacted.
- 2025-11-16: Swapped Nano Banana art modes to retro/modern/futuristic names plus prompt descriptors; no roadmap bullets impacted.
- 2025-11-17: Stored Nano Banana previews in Cloud Storage to replace oversized Firestore payloads and cleared the Nano Banana share caching backlog item.
- 2025-11-17: Added App Engine version pruning to the deploy workflow; no roadmap bullets impacted.
- 2025-11-17: Softened Nano Banana storage failures so project updates can proceed even when generative art persistence is unavailable; no roadmap bullets impacted.
- 2025-11-18: Surfaced Nano Banana storage failures to clients instead of silently clearing thumbnails; no roadmap bullets impacted.
- 2025-11-17: Updated App Engine version pruning to skip active versions after deployment; no roadmap bullets impacted.
- 2025-11-17: Clarified App Engine pruning to keep the five newest zero-traffic versions during deploy cleanup; no roadmap bullet
s impacted.


- 2025-11-17: Stabilized workspace project selection URL syncing to stop strobing between projects after creating a new project; no roadmap bullets impacted.
- 2025-11-17: Removed an unused `Link` import in `code/App.tsx` so frontend linting passes; no roadmap bullets impacted.

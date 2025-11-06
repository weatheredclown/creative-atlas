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

## Segment B — Feature Depth & Design Polish
- Build the simulated history heatmap: aggregate timeline data in Firestore and render a heatmap visualization in `code/src/features/history/`.
- Deliver character arc tooling: add progression states and visualizations for characters, ensuring integration with the relationship graph.
- Create procedural encounter generator: blend Dustland and PIT lore to output encounters; expose controls in the quest builder UI.
- Expand export formats: support Dustland ACK, D&D cards, visual novel scenes, scripts, and auto-generated character sheets/campaign packets.
- Implement canon enforcement workflows: add NPC memory mode, truth/canon lock approvals, and lore distillation pipelines.

## Segment C — Tutorial & Education Experience
- Build interactive stepper tutorials covering world creation, project linking, publishing, and analytics, based on `docs/stepper-tutorial-design.md`.
- Layer onboarding, accessibility, and localization improvements focused on first-time creators.
- Produce support content: integrated FAQs, in-app documentation, and contextual tooltips that teach advanced features.

## Segment D — Compliance & Operations
- Formalize data retention, moderation, and privacy policies with enforcement hooks in backend services.
- Integrate analytics & monitoring: instrument key flows, set up alerting, and document operational runbooks.

## Segment E — Research & Sequencing Queue
- Document decisions required for collaboration scope (real-time vs. turn-based) and list dependencies before implementation begins.
- Capture the current template recommendation heuristic and outline enhancements for richer ranking.

When a segment is cleared, remove its heading entirely. If new priorities emerge, add them as new segments so the roadmap always reflects the next meaningful slices of work.

## Productionization Roadmap

### Persistent, Multi-User Data Layer
- [x] Launch a managed database-backed service (Firebase) and migrate project, artifact, and XP storage out of in-memory mocks.
- [x] Expose CRUD endpoints with pagination, validation, and schema enforcement so multiple users can manage separate worlds safely.
- [x] Move CSV/Markdown import and export flows to backend workers or endpoints to centralize validation and keep the UI responsive during large transfers.
- 📘 See [`docs/firebase-backend-migration.md`](docs/firebase-backend-migration.md) for the recommended Firebase + Firestore architecture and step-by-step migration plan (starting with authentication setup).

### Authentication, Authorization, and Profiles
- [x] Add sign-up and login flows with token-based authentication for the web client.
- [x] Associate every project and artifact with an owner and enforce row-level authorization rules.
- [x] Persist user-specific settings, XP totals, and achievements so progress follows accounts across devices.

### Collaboration & Offline-Resilient UX (do not implement yet)
- [ ] Decide on collaboration scope (real-time, turn-based, etc.) and add the necessary synchronization layer (websockets, CRDTs) for shared editing.
- [ ] Implement optimistic UI updates with conflict resolution to keep the workspace fluid during network delays.
- [ ] Add background draft syncing and local caching so editors remain usable when offline or during service interruptions.

### AI Platform Hardening (low priority)
- [ ] Proxy Gemini (and future model) calls through a secure backend to keep API keys out of the client.
- [ ] Capture the current exact-title recommendation heuristic used by templates and schedule richer ranking once higher-priority systems land.

### Robust Import/Export & Publishing
- [ ] Validate CSV/Markdown inputs on the server and return actionable schema errors to the client.
- [ ] Turn “Publish Site” into a backend-driven export that produces deployable static bundles hosted on durable storage/CDNs.

### Operational Readiness
- [x] Add linting, unit, integration, and end-to-end tests alongside the existing Vite build to create a regression safety net.
- [x] Stand up continuous integration that runs the full test suite on every pull request.

### Productization & Compliance (low priority)
- [ ] Layer in onboarding, documentation, accessibility, and localization improvements for first-time users.
- [ ] Establish policies for data retention, content moderation, and privacy covering generated and uploaded content.
- [x] Provide support and education content (tutorials, FAQs) that make the product approachable for new creators.

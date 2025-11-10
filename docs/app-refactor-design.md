# App Refactor Design

## Goals
- Shrink `App.tsx` by extracting static data and helper routines.
- Encapsulate artifact filter and GitHub publishing logic inside reusable hooks.
- Split the monolithic `App` view into a light-weight layout container and a focused project workspace component.

## Progress Notes
- Created `ProjectWorkspace` (under `code/components/workspace/`) to host artifact workflows, quick fact capture, and GitHub publish orchestration outside of `App.tsx`.
- Upcoming focus: break down `ProjectWorkspaceContainer` into the planned hero, artifact panel, activity panel, and modal subcomponents to finish slimming the workspace layer.

## Proposed Structure

### Data Modules (`code/src/data/`)
- `quests.ts`: export `DAILY_QUESTS_PER_DAY`, `DAILY_QUEST_POOL`, and `questlines`.
- `templates.ts`: export `templateLibrary` and `projectTemplates`.
- `milestones.ts`: export `milestoneRoadmap`.
- `achievements.ts`: export `achievements`.
- `aiAssistants.ts`: export `aiAssistants`.

Static content will be consumed by workspace components via named imports. Each file keeps a single concern and simplifies tree-shaking.

### Utility Modules (`code/utils/`)
- `artifactMetrics.ts`: contain artifact counting helpers (type counts, timeline stats, tag counters, etc.).
- `quickFacts.ts`: provide quick fact helpers (`deriveQuickFactTitle`, `createQuickFactSummary`, `createQuickFactContent`, `isQuickFactArtifact`, etc.).
- `date.ts`: host `getCurrentDateKey` and related helpers.

These helpers remain pure functions with unit-test friendly exports.

### Hooks (`code/hooks/`)
- `useArtifactFilters.ts`: accept `projectArtifacts` and optional defaults, manage filter state (`viewMode`, `artifactTypeFilter`, `statusFilter`, `activeTagFilters`, `searchTerm`), memoize derived collections (`filteredArtifacts`, `availableStatuses`, `availableTagFilters`), and expose reset/toggle handlers.
- `useGitHubPublish.ts`: encapsulate GitHub publish modal state, OAuth polling, message listener, and publish handlers. Expose methods like `startAuthorization`, `publishToRepository`, `openModal`, `closeModal`, `resetStatus`, and status flags (`authStatus`, `isPublishing`, `error`, `success`, `statusMessage`, `isModalOpen`). Dependencies on `getIdToken`, `selectedProject`, `projectArtifacts`, and API helpers will be passed in as parameters.

### Components
- `components/ViewSwitcher.tsx`: move inline view switcher to its own file.
- `components/ProjectWorkspace.tsx`: manage project-specific state (artifact filters, quick facts modal, GitHub publishing via custom hooks, project visibility, milestone progress, etc.). It receives the currently selected project ID, artifacts, and user/profile context from `App`.

### App Layout Responsibilities

`App.tsx` becomes a layout shell responsible for:
- Loading global context (`useUserData`, `useAuth`).
- Managing `selectedProjectId`, `projectSearchTerm`, and `projectStatusFilter` for the sidebar.
- Rendering `Header`, sidebar lists (projects, quests, achievements), and `ProjectWorkspace`.
- Forwarding necessary callbacks (project CRUD, artifact CRUD) down to `ProjectWorkspace`.

### Project Workspace Responsibilities

`ProjectWorkspace` handles:
- Project-specific derived data (artifacts, activity log, milestone progress).
- Artifact CRUD actions, quick fact creation, template application.
- Integration with `useArtifactFilters` and `useGitHubPublish`.
- Rendering artifact explorer, hero, editors, and modals relevant to the selected project.

### Workspace Composition

Break the workspace into focused presentation layers so shared hooks stay reusable:

- `ProjectWorkspace`: orchestrates data loading, passes derived state and action handlers to child sections.
- `WorkspaceHero`: renders the project summary banner (name, description, owner, visibility controls, milestone snapshot).
- `WorkspaceArtifactPanel`: shows filterable artifact lists, quick fact modals, and artifact-specific actions.
- `WorkspaceActivityPanel`: renders timeline/history, milestone progress, and quest updates tied to the active project.
- `WorkspaceModals`: houses modal containers (quick facts, template picker, GitHub publish) and subscribes to hook state.

Each child lives under `code/components/workspace/` so the primary workspace file stays under ~200 lines and reads as a routing container instead of a monolith.

### Hook Contracts & Data Flow

Documented contracts keep the new hooks stable and testable:

- `useArtifactFilters(projectArtifacts, defaults?)`
  - **Inputs**: full artifact list, optional default filters (view mode, type, status, tags, search term).
  - **Outputs**: memoized `filteredArtifacts`, `availableStatuses`, `availableTagFilters`, plus event handlers (`resetFilters`, `setViewMode`, `toggleTagFilter`, `setStatusFilter`, `setSearchTerm`).
  - **Side Effects**: none; the hook stays pure and only stores React state.
- `useGitHubPublish({ getIdToken, selectedProject, projectArtifacts, api })`
  - **Inputs**: dependency bag for API helpers and project context.
  - **Outputs**: `authStatus`, `isPublishing`, `statusMessage`, `error`, `success`, `isModalOpen`, alongside `startAuthorization`, `publishToRepository`, `openModal`, `closeModal`, and `resetStatus` handlers.
  - **Side Effects**: maintains polling timers and window message listeners internally; callers never manage timers directly.

### Migration Timeline

1. **Extract data modules**: copy static constants to the new `code/src/data/` files and update imports in `App.tsx` and dependent components.
2. **Introduce utilities**: move helper functions to `code/utils/` modules, ensuring named exports mirror existing signatures.
3. **Author hooks**: implement `useArtifactFilters` and `useGitHubPublish` with unit tests covering filter resets, publish polling, and error states.
4. **Create workspace components**: scaffold the new workspace directory structure, moving view-specific JSX from `App.tsx` into the appropriate child components.
5. **Slim `App.tsx`**: rewire the layout shell to render the new workspace component, removing legacy inline logic.
6. **Retire unused code**: delete any obsolete helpers once all imports point to the new modules and verify the bundle builds cleanly.

### Testing & QA Strategy

- Add hook-level tests under `code/hooks/__tests__/` covering filter state transitions and GitHub publish lifecycle events.
- Update existing `App` integration tests (or add React Testing Library coverage) to ensure the layout shell still renders key sections when the workspace is mounted.
- Run `npm run lint --prefix code` and `npm test --prefix code` before submitting refactor commits to catch regressions early.
- Smoke test the publish flow against the staging backend to confirm OAuth polling timers clean up correctly when the modal closes.

### Open Questions

- Should quick fact creation move into its own hook (`useQuickFacts`) to align with the modular approach? If so, define the responsibilities before migrating logic.
- Does the workspace need feature flag awareness (e.g., gating GitHub publish for guest mode)? Determine whether the hook or the layout shell should own that logic.
- How should we persist filter state across navigations? Consider routing parameters vs. local storage once the initial refactor lands.

## Risk Mitigation
- Migrate constants and functions incrementally: export from new modules first, update imports, then remove in `App.tsx`.
- Add focused unit coverage where possible (if time allows) for new hooks.
- Ensure GitHub publish hook mirrors existing side effects (OAuth polling, publish history updates) before deletion from `App.tsx`.

## Deliverables
1. New data and utility modules with updated imports.
2. New custom hooks and component files.
3. Refactored `App.tsx` orchestrating layout and delegating workspace logic.
4. Updated roadmap entry referencing the refactor segment.

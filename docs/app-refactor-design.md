# App Refactor Design

## Goals
- Shrink `App.tsx` by extracting static data and helper routines.
- Encapsulate artifact filter and GitHub publishing logic inside reusable hooks.
- Split the monolithic `App` view into a light-weight layout container and a focused project workspace component.

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

`App.tsx` becomes a layout shell responsible for:
- Loading global context (`useUserData`, `useAuth`).
- Managing `selectedProjectId`, `projectSearchTerm`, and `projectStatusFilter` for the sidebar.
- Rendering `Header`, sidebar lists (projects, quests, achievements), and `ProjectWorkspace`.
- Forwarding necessary callbacks (project CRUD, artifact CRUD) down to `ProjectWorkspace`.

`ProjectWorkspace` handles:
- Project-specific derived data (artifacts, activity log, milestone progress).
- Artifact CRUD actions, quick fact creation, template application.
- Integration with `useArtifactFilters` and `useGitHubPublish`.
- Rendering artifact explorer, hero, editors, and modals relevant to the selected project.

## Risk Mitigation
- Migrate constants and functions incrementally: export from new modules first, update imports, then remove in `App.tsx`.
- Add focused unit coverage where possible (if time allows) for new hooks.
- Ensure GitHub publish hook mirrors existing side effects (OAuth polling, publish history updates) before deletion from `App.tsx`.

## Deliverables
1. New data and utility modules with updated imports.
2. New custom hooks and component files.
3. Refactored `App.tsx` orchestrating layout and delegating workspace logic.
4. Updated roadmap entry referencing the refactor segment.

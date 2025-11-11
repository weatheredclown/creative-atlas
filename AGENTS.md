# Agent Instructions

This document provides instructions for agents working on the Creative Atlas codebase.

## General

*   The repository is a monorepo with a React frontend in the `code/` directory and a Node.js Express backend in the `server/` directory.
*   The frontend is a Vite + React + TypeScript application.
*   The backend is a Node.js Express application written in TypeScript.
*   When introducing new environment variables or externally configured secrets, document how to provision them in the README and update `.github/workflows/firebase-hosting-merge.yml` so the CI environment stays in sync.
*   The GCP project ID is `creative-atlas`, the App Engine API is hosted at `creative-atlas.uc.r.appspot.com`, and the primary web URL is `https://creative-atlas.web.app`.

## Automation Initiative Tracking

*   Use `docs/automation-initiative-roadmap.md` to coordinate multi-session progress. Every new work session must start by reviewing this roadmap and end by updating it.
*   Keep the roadmap focused on immediate, actionable tasks. When you complete a bullet, delete it from the file so the document eventually empties out as the initiative finishes.
*   If work is re-scoped or blocked, adjust or split the relevant bullet so the next agent inherits a clear, execution-ready next step. Link to supporting docs (designs, research) when available.
*   Mention in your summary which roadmap bullets you touched so reviewers can trace progress back to the shared plan.

## Frontend

### Components

*   Components are functional components written in TypeScript with React.
*   File names should be in PascalCase (e.g., `MyComponent.tsx`).
*   Props should be clearly defined with interfaces.
*   Styling is done with Tailwind CSS.
*   State should be managed with the `useState` hook for local component state.

### Dependencies

*   To install frontend dependencies, run `npm install` in the `code/` directory.
*   To run the frontend development server, run `npm run dev` in the `code/` directory.
*   To run frontend unit tests, run `npm test` in the `code/` directory.
*   To run frontend E2E tests, run `npm run test:e2e` in the `code/` directory.

## Backend

### Routes

*   Routes are defined in a modular way using `express.Router`.
*   Asynchronous operations should be handled with the `asyncHandler` utility.
*   Data validation is performed using the Zod library, with schemas defined for different data models.
*   Authentication is handled through middleware.

### Dependencies

*   To install backend dependencies, run `npm install --prefix server`.
*   To run the backend in development mode, use `npm run dev --prefix server`.
*   To run backend tests, run `npm test --prefix server`.
*   To build the backend, run `npm run build --prefix server`.

# general
*   If your changes affect the onboarding flow, update the tutorial steps in `code/utils/tutorial.ts` to reflect the new user experience.

## Pull Requests
- Provide a concise summary of the changes along with any notable implementation details.
- Note any new dependencies introduced and justify their necessity.
- Include screenshots or GIFs when modifying UI components.
- Capture product screenshots using guest mode (`?guest=1`) so logged-in features are visible, unless you are intentionally showing the authentication screen.
- Do not submit changes unless `npm run lint --prefix code` completes successfully.



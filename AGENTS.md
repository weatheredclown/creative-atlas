# Agent Instructions

This document provides instructions for agents working on the Creative Atlas codebase.

## General

*   The repository is a monorepo with a React frontend in the `code/` directory and a Node.js Express backend in the `server/` directory.
*   The frontend is a Vite + React + TypeScript application.
*   The backend is a Node.js Express application written in TypeScript.

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

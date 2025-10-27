# Agent Instructions

Welcome to the creative-atlas repository! Please follow these guidelines when making changes within this project:

## Repository-wide Conventions
- The interactive prototype lives in `code/` and is a Vite + React + TypeScript app. Make all frontend changes inside that directory unless a task specifies otherwise.
- Run `npm install` inside `code/` the first time you work in this repo so the Vite toolchain is available.
- Use `npm run build` from `code/` before opening a pull request. It runs the TypeScript compiler and catches most integration issues for this prototype.
- If you add or rename npm scripts, document them in `README.md` so others know how to run them.
- Favor descriptive variable and function names; avoid abbreviations that are not widely understood.
- Keep commits focused and well-described in their messages.
- Update documentation in `README.md` or relevant files if behavior changes.

## Frontend Code Style (code/)
- Components are written as React function components in TypeScript. Follow that pattern unless there is a strong reason not to.
- Tailwind-style utility classes are used extensively; keep styling changes consistent with the existing class-based approach.
- Share reusable UI through the existing `components/` folder. Create new files rather than adding large inline components inside other files when functionality grows.
- Domain models live in `code/types.ts`. When you extend data structures, update the corresponding TypeScript types and any mock data in `App.tsx` to keep the prototype consistent.

## Pull Requests
- Provide a concise summary of the changes along with any notable implementation details.
- Note any new dependencies introduced and justify their necessity.
- Include screenshots or GIFs when modifying UI components.

Thank you for contributing!

# Template Authoring Workflow

The current Creative Atlas prototype ships with a **hard-coded template system** that lives entirely in the frontend. This document explains how those templates are structured, how they flow through the UI, and what would be required to replace the hand-tuned arrays with an authoring or import tool after the MVP.

## Where templates live today

All template data is defined in [`code/App.tsx`](../code/App.tsx):

- `templateLibrary: TemplateCategory[]` – describes the single-artifact "Template Library" groupings. Each entry represents a category card in the right rail and contains:
  - `id`, `title`, and `description` – surfaced in the gallery UI.
  - `recommendedFor` – a list of project names used to highlight the category when that project is active.
  - `relatedProjectTemplateIds` – references into the multi-artifact project templates that bundle the same content.
  - `templates` – the individual artifact blueprints, each with an `id`, `name`, `description`, and optional `tags`.
- `projectTemplates: ProjectTemplate[]` – defines the multi-artifact kits shown in the "Project Templates" picker. Each template includes:
  - Metadata (`id`, `name`, `description`, `recommendedFor`, `projectTags`).
  - `relatedCategoryIds` – back-references into `templateLibrary` for consistent cross-linking.
  - `artifacts` – the starter artifacts that will be cloned into the currently selected project when the template is applied. These objects mirror the `Artifact` shape from [`types.ts`](../code/types.ts) and can include seed `data` (e.g., wiki markdown, task state, conlang lexemes).

Because everything is declared inline, changes require a code edit and rebuild. There is no persistence layer or admin UI yet; the arrays function as curated sample content for demos.

## How the UI consumes templates

Two components read the arrays directly from `App.tsx`:

- [`ProjectTemplatePicker`](../code/components/ProjectTemplatePicker.tsx) presents the `projectTemplates` kits, computes recommended kits based on the active project title, and hydrates artifacts via `onApplyTemplate` when the user selects one.
- [`TemplateGallery`](../code/components/TemplateGallery.tsx) renders the `templateLibrary` categories, links them back to related project templates, and supports keyword filtering and project-specific recommendations.

Because the arrays are passed into these components as props, any structural change must keep the existing TypeScript interfaces intact or update the component logic alongside the data update.

## Editing or adding templates

1. Open [`code/App.tsx`](../code/App.tsx).
2. Locate the `templateLibrary` or `projectTemplates` constants near the top of the file.
3. Add, update, or remove entries while keeping the TypeScript shapes valid. For artifacts, ensure the data payloads align with `ArtifactType` defaults. You can inspect `getDefaultDataForType` in the same file for guidance.
4. Update any cross-references:
   - Categories should list the IDs of project templates that bundle them in `relatedProjectTemplateIds`.
   - Project templates should include matching category IDs in `relatedCategoryIds` so both surfaces stay synchronized.
5. Rebuild the frontend (`npm run build` from the `code/` directory) to verify the TypeScript compiler accepts the changes.

## Known limitations & future tooling scope

The current approach is brittle because it requires engineers to edit TypeScript whenever the content library changes. A post-MVP tooling pass should:

1. **Persist templates in a backend** so project templates and categories can be authored without redeploying the client.
2. **Add an admin surface** that allows product/design teams to curate template categories, adjust recommendations, and preview bundled artifacts before publishing them.
3. **Support structured imports** (CSV/Markdown/JSON) that mirror the existing template shapes to bootstrap new kits.
4. **Version templates** so in-flight projects can opt-in to updated bundles without overwriting customized artifacts.
5. **Provide migration scripts** to export the current hard-coded arrays into the new storage format as a starting dataset.

Until those systems exist, treat the arrays in `App.tsx` as the single source of truth for template content.

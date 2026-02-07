## 2024-05-24 - [Micro-UX: Tooltips on Icon-Only Buttons]
**Learning:** While `aria-label` and `sr-only` text ensure accessibility for screen readers, mouse users often lack context for icon-only buttons. Adding a `title` attribute matching the accessible label provides a native tooltip, bridging this gap without extra UI overhead.
**Action:** Always pair `aria-label` (or `sr-only` text) with `title` on icon-only buttons to support both screen reader and mouse users.

## 2024-05-24 - [Micro-UX: Accessible Form Validation]
**Learning:** Visual error messages alone are insufficient for screen reader users. By linking inputs to error messages via `aria-describedby` and marking errors with `role="alert"`, we ensure immediate feedback is announced when validation fails.
**Action:** Add `aria-invalid={!!error}`, `aria-describedby="error-id"`, and `role="alert"` to form validation patterns.

## 2024-05-25 - [Micro-UX: Accessible Inputs in Complex Forms]
**Learning:** Complex editors like `CharacterEditor` often use auxiliary inputs (like "Add Trait" or "Search") that lack visible labels for layout reasons. These become "ghost inputs" to screen reader users.
**Action:** When visual labels are omitted for density, always provide descriptive `aria-label` attributes, dynamic ones if the context requires it (e.g., "Search candidates for Parents").

## 2024-05-25 - [Micro-UX: Dynamic Tooltips for List Items]
**Learning:** In lists of similar items (like relations or tags), a static tooltip like "Remove relation" is insufficient for mouse users to distinguish between buttons. Dynamic tooltips matching the `aria-label` (e.g., "Remove Parent relation to John") provide necessary context.
**Action:** When mapping over a list to render action buttons, always use dynamic values in the `title` attribute to match the specific context of the item.

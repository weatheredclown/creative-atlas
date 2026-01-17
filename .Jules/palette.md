## 2024-05-24 - [Micro-UX: Tooltips on Icon-Only Buttons]
**Learning:** While `aria-label` and `sr-only` text ensure accessibility for screen readers, mouse users often lack context for icon-only buttons. Adding a `title` attribute matching the accessible label provides a native tooltip, bridging this gap without extra UI overhead.
**Action:** Always pair `aria-label` (or `sr-only` text) with `title` on icon-only buttons to support both screen reader and mouse users.

## 2024-05-25 - [Accessibility: Form Validation and Error Association]
**Learning:** Merely displaying an error message below an input is insufficient for screen readers. Users rely on programmatic association to understand which field has an error and what the error is.
**Action:** When displaying validation errors, always use `aria-invalid="true"` on the input and associate it with the error message using `aria-describedby="error-id"`. Ensure the error message has `role="alert"` or `aria-live` properties for immediate feedback.

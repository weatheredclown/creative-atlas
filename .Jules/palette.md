## 2024-05-24 - [Micro-UX: Tooltips on Icon-Only Buttons]
**Learning:** While `aria-label` and `sr-only` text ensure accessibility for screen readers, mouse users often lack context for icon-only buttons. Adding a `title` attribute matching the accessible label provides a native tooltip, bridging this gap without extra UI overhead.
**Action:** Always pair `aria-label` (or `sr-only` text) with `title` on icon-only buttons to support both screen reader and mouse users.

## 2026-01-14 - [Async Modal Forms]
**Learning:** Forms inside modals (like `CreateProjectForm`) were closing immediately on submit, preventing loading states from being visible.
**Action:** Ensure form submit handlers await async `onCreate` actions and manage a local `isSubmitting` state before closing (or letting the parent close).

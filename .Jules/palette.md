## 2024-05-24 - [Micro-UX: Tooltips on Icon-Only Buttons]
**Learning:** While `aria-label` and `sr-only` text ensure accessibility for screen readers, mouse users often lack context for icon-only buttons. Adding a `title` attribute matching the accessible label provides a native tooltip, bridging this gap without extra UI overhead.
**Action:** Always pair `aria-label` (or `sr-only` text) with `title` on icon-only buttons to support both screen reader and mouse users.

## 2024-05-24 - [Progressive Disclosure in Editors]
**Learning:** Artifact editors use a "Reveal Depth" toggle to hide complex inputs (Traits, Features) by default. This keeps the UI clean but hides key functionality from new users and automation.
**Action:** Ensure "Reveal Advanced Fields" is clearly visible or prompted when a user attempts to edit detailed properties.

## 2024-05-24 - [Micro-UX: Tooltips on Icon-Only Buttons]
**Learning:** While `aria-label` and `sr-only` text ensure accessibility for screen readers, mouse users often lack context for icon-only buttons. Adding a `title` attribute matching the accessible label provides a native tooltip, bridging this gap without extra UI overhead.
**Action:** Always pair `aria-label` (or `sr-only` text) with `title` on icon-only buttons to support both screen reader and mouse users.

## 2024-05-24 - [Accessibility: Focus Consistency on Custom Buttons]
**Learning:** Custom icon buttons (especially those removing default styles with `focus:outline-none`) often become invisible to keyboard users.
**Action:** Explicitly add `focus-visible:ring-2` (and `focus-visible:ring-offset-2` where contrast is needed) to all custom interactive elements to ensure they remain navigable.

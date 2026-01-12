## 2024-05-24 - [Micro-UX: Tooltips on Icon-Only Buttons]
**Learning:** While `aria-label` and `sr-only` text ensure accessibility for screen readers, mouse users often lack context for icon-only buttons. Adding a `title` attribute matching the accessible label provides a native tooltip, bridging this gap without extra UI overhead.
**Action:** Always pair `aria-label` (or `sr-only` text) with `title` on icon-only buttons to support both screen reader and mouse users.

## 2024-10-24 - [Accessibility: Dynamic List Actions]
**Learning:** In dynamic lists (like character traits), generic "Delete" labels are insufficient. Screen reader users need context on *what* item is being acted upon.
**Action:** Use template literals in `aria-label` (e.g., `Remove trait ${trait.key}`) to provide precise context for repetitive actions in lists.

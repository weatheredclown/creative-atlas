## 2024-05-24 - [Micro-UX: Tooltips on Icon-Only Buttons]
**Learning:** While `aria-label` and `sr-only` text ensure accessibility for screen readers, mouse users often lack context for icon-only buttons. Adding a `title` attribute matching the accessible label provides a native tooltip, bridging this gap without extra UI overhead.
**Action:** Always pair `aria-label` (or `sr-only` text) with `title` on icon-only buttons to support both screen reader and mouse users.

## 2025-05-18 - [Interaction: Loading States on Submit Buttons]
**Learning:** Disabling a submit button prevents double-submission but fails to communicate *why* the interface is unresponsive. Adding a spinner and changing the label to "Saving..." provides immediate, reassuring feedback that the system is working.
**Action:** Always include a visual loading indicator (spinner + text change) on async action buttons, not just a disabled state.

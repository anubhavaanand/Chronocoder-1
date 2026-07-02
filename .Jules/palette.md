## 2025-07-02 - Disabled states with helpful tooltips
**Learning:** Found that users can click action buttons before prerequisites are met, resulting in jarring warning messages. In Streamlit, disabling buttons with context-aware tooltips provides better immediate feedback than post-click warnings.
**Action:** Implemented disabled states and conditional help text on the 'Export to Markdown' and 'Get Mentor Feedback' buttons to guide users proactively.

## 2026-07-02 - Keyboard Focus and Contrast Enhancement
**Learning:** Streamlit components lack strong default focus indicators for keyboard navigation and sometimes inherit global styles that break contrast (e.g., black text on dark buttons). Fixing syntax errors in injected CSS blocks is essential before adding overrides.
**Action:** Added explicit `:focus-visible` styling for buttons and form inputs, enforced white text on buttons, and repaired a broken CSS block to restore correct rendering.

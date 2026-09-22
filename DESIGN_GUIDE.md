# ChronoCoder - Design System Quick Reference Guide

## 🎨 Color Palette

### Primary Colors
```css
--color-bg-primary: #0a0a0f        /* Main background */
--color-bg-secondary: #11111a      /* Cards/surfaces */
--color-bg-tertiary: #1a1a2e       /* Elevated backgrounds */
```

### Neon Accents
```css
--neon-cyan: #00f3ff               /* Hero highlight */
--neon-magenta: #ff00ff            /* Secondary accent */
--neon-amber: #ffb000              /* Warnings/highlights */
--neon-green: #00ff41              /* Success/code/text */
```

### Text Colors
```css
--text-primary: #ffffff            /* Main text */
--text-secondary: rgba(255, 255, 255, 0.7)
--text-muted: rgba(255, 255, 255, 0.4)
```

---

## 🔧 Common Component Patterns

### Glassmorphism Card
```html
<div class="retro-card">
    <!-- Content here -->
</div>
```

CSS includes:
- Frosted glass effect (backdrop-filter blur)
- Neon border with hover glow
- Gradient overlay animation
- 3D transform on hover

### Neon Button
```html
<button class="stButton">LABEL</button>
<!-- or -->
<button class="stButton" kind="primary">PRIMARY BUTTON</button>
```

Ghost button = transparent with neon border  
Primary button = gradient filled with pulse animation

### Terminal Header
```html
<div class="cc-terminal-header">
    <div class="cc-terminal-dots">
        <div class="cc-terminal-dot red"></div>
        <div class="cc-terminal-dot yellow"></div>
        <div class="cc-terminal-dot green"></div>
    </div>
    <span class="cc-terminal-title">TITLE — subtitle</span>
</div>
```

Use for code editors, admin panels, terminal outputs.

---

## 📐 Spacing Scale

```css
--spacing-xs: 0.5rem   (8px)
--spacing-sm: 1rem     (16px)
--spacing-md: 1.5rem   (24px)
--spacing-lg: 2rem     (32px)
--spacing-xl: 3rem     (48px)
--spacing-2xl: 4rem   (64px)
```

**Rule of thumb**: Use multiples of spacing-sm (1rem/16px)

---

## 🔘 Border Radius

```css
--radius-sm: 4px     /* Buttons, small elements */
--radius-md: 8px     /* Cards, inputs, alerts */
--radius-lg: 16px    /* Large cards, hero sections */
--radius-xl: 24px    /* Special overlays */
```

---

## ⚡ Animation Timing

```css
--transition-fast: 150ms    /* Hover effects, focus states */
--transition-normal: 300ms  /* Standard transitions */
--transition-slow: 500ms    /* Major state changes */
```

---

## 🎭 Per-Mentor Accent Injection

To apply mentor-specific colors dynamically:

```python
from themes import get_mentor_theme
mentor_theme = get_mentor_theme(st.session_state.selected_mentor)

# Inject custom CSS
st.markdown(
    styles.get_mentor_workspace_css(
        mentor_theme["accent"], 
        mentor_theme["accent_soft"]
    ),
    unsafe_allow_html=True
)
```

This automatically applies:
- Mentor's accent color to buttons on hover
- Dynamic background gradients
- Alert borders
- Greeting card left borders

---

## 🎨 Utility Classes

### Text Colors
```css
.text-neon-cyan    /* Cyan text */
.text-neon-magenta
.text-neon-green
.text-neon-amber
```

### Glow Effects
```css
.glow-cyan         /* Cyan shadow */
.glow-magenta
.glow-green
.glow-amber
```

### Borders
```css
.border-neon-cyan   /* Cyan border */
.border-neon-magenta
.border-neon-green
```

### Font Override
```css
.font-mono          /* JetBrains Mono font stack */
```

---

## 💻 Code Styling

### Inline Code
```python
code("variable", language="python")  # Auto-styled
```

### Code Blocks
```python
st.code("""
def example():
    return "Hello World"
""")
# Gets: green left border, dark background, styled scrollbar
```

### Markdown Code
```markdown
`inline code` gets amber text with light background

```python
multi-line code block gets full styling
```
```

---

## 🚦 Alert Types

```python
st.success("Success message!")   # Green left border + glow
st.info("Information")           # Cyan left border + glow
st.warning("Warning")           # Amber left border + glow
st.error("Error message!")      # Magenta left border + glow
```

All include:
- Terminal-style background
- Left accent border (4px)
- Colored glow shadow
- Rounded corners

---

## 🔍 Focus States

All interactive elements get visible focus outlines on keyboard navigation:
```css
outline: 3px solid var(--neon-cyan);
outline-offset: 4px;
box-shadow: var(--glow-cyan);
```

**Accessibility note**: Focus rings don't appear on mouse interactions (CSS default behavior).

---

## 📱 Responsive Breakpoints

Mobile (< 768px):
```css
padding reduces by 25%
font sizes scale down
side-by-side columns stack vertically
```

Tablet (768px - 1024px):
```css
Medium padding
Some layouts remain two-column
Typography scaled
```

Desktop (> 1024px):
```css
Full padding, max-width 1400px
Two-column main grid
Maximum visual impact
```

---

## ⚙️ Customization Tips

### Change Accent Color Globally
Modify `:root` variables in `styles.py`:
```css
:root {
    --neon-cyan: #YOUR_COLOR;
    --neon-magenta: #YOUR_COLOR;
}
```

### Adjust Glow Intensity
```css
--glow-cyan: 0 0 20px rgba(0, 243, 255, 0.4);
/* Increase 0.4 → 0.8 for stronger glow */
```

### Remove Animations Completely
Add to your page:
```css
<style>
* {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
}
</style>
```

### CRT Scanline Overlay
Add at top of any page:
```html
<div class="crt-overlay"></div>
```
Optional vintage monitor effect (use sparingly!).

---

## 🎯 Best Practices

### DO
✅ Use utility classes when available  
✅ Keep animations subtle (< 300ms)  
✅ Maintain contrast ratios (> 4.5:1)  
✅ Test on mobile devices  
✅ Respect user motion preferences  

### DON'T
❌ Mix multiple neon colors on same element  
❌ Overuse animations (causes distraction)  
❌ Forget fallback fonts  
❌ Ignore accessibility guidelines  
❌ Use system defaults when custom exists  

---

## 🔮 Troubleshooting

### "Styles aren't loading!"
→ Ensure `unsafe_allow_html=True` is used with `st.markdown()`  
→ Check browser console for CSS errors  
→ Clear Streamlit cache: `streamlit run main.py --server.enableCORS false`

### "Colors look washed out!"
→ Verify `--color-bg-primary` is set to `#0a0a0f` (not pure black)  
→ Ensure no competing styles override design tokens  
→ Check if parent containers have background colors interfering

### "Animations stutter!"
→ Reduce number of animated elements per screen  
→ Enable GPU acceleration: add `will-change: transform` to animated items  
→ Simplify complex Three.js scenes

### "Text hard to read!"
→ Increase line-height from 1.7 to 1.8-2.0  
→ Add more contrast with `--text-primary` vs background  
→ Reduce decorative elements around body text

---

## 📖 Full Documentation

For complete details, see:
- `/home/anubhavanand/Documents/Projects/Chronocoder-1/styles.py` - All CSS code (~550 lines)
- `/home/anubhavanand/Documents/Projects/Chronocoder-1/REDESIGN_SUMMARY.md` - Comprehensive change log
- `/home/anubhavanand/Documents/Projects/Chronocoder-1/design_system_prompt.txt` - Original design brief

---

## 🤝 Quick Start for New Features

Need to add a new component? Follow this pattern:

1. **Define structure** in HTML template
2. **Apply existing utility classes** first (check list above)
3. **If custom needed**, add CSS to appropriate section in `styles.py`:
   - `.cc-hero-container` = Archive gallery style
   - `.cc-main-grid` = Workspace layout
   - `.retro-card` = Glassmorphic card base
4. **Test responsiveness** across device sizes
5. **Verify accessibility** (keyboard nav, focus states)

---

**Version**: v2.0 Retro Computing Theme  
**Last Updated**: 2026-09-23  
**Maintained by**: Anubhav & AI Assistant  

> "Good design is obvious. Great design is transparent." ✨

# Plan: Distortion & Grain Homepage Integration

## Goal
Apply the Distortion & Grain OpenDesign frontend to the Chronocoder home page (`/`) only, preserving all existing features, routing, workspace page, and AI mentor functionality.

## Current State
- Next.js 16 + React 19 + TypeScript + Tailwind v4 at `/home/anubhavanand/Documents/Projects/Chronocoder-1`
- Home page (`src/app/page.tsx`) already has partial Distortion & Grain integration:
  - `WebGLBackgroundWrapper` rendered
  - `HeroGLTarget` and `ScrollIndicator` imported from `HeroDistortion`
  - Mentor cards with glass styling
  - Section dividers
  - Scroll progress track
- Workspace page (`src/app/workspace/[mentorId]/page.tsx`) uses retro styling (`glass-effect`, `bg-retro-darker`, `border-retro-border`) — must stay untouched
- `WebGLBackground.tsx` has gallery shaders but queries `img[data-gl-src]`
- `HeroDistortion.tsx` has `HeroGLTarget` and `MentorGLTarget` with `data-gl-src`
- `MentorCard.tsx` already imports and renders `MentorGLTarget`

## Constraints
- Workspace page must remain 100% unchanged
- Backend, routing, and all existing features must keep working
- Home page must get the full Distortion & Grain visual treatment
- New branch: `feat/distortion-grain-homepage`

## Implementation Tasks

### 1. Branch Setup
```bash
git checkout -b feat/distortion-grain-homepage
```

### 2. Fix `src/app/page.tsx`
**Problem:** Uses `dynamic` from `next/dynamic` without importing it.

**Fix:** Add `import dynamic from "next/dynamic";` at the top.

**Enhancements to match gallery design:**
- Ensure header matches gallery's fixed glass header with live dot, wordmark, and badge
- Ensure hero section uses gallery typography (`clamp(52px, 9vw, 116px)`, `letter-spacing: -0.04em`)
- Ensure gallery-style section dividers (`Works`, `Features`) are present
- Ensure scroll progress track matches gallery exactly
- Ensure footer matches gallery style with attribution

### 3. Verify `src/components/mentor/MentorCard.tsx`
- Already has `MentorGLTarget` imported and rendered
- Already has glass caption bar from gallery design
- No changes needed unless broken

### 4. Verify `src/components/ui/WebGLBackground.tsx`
- Already has gallery shaders (vertex bend + simplex noise + film grain)
- Already queries `img[data-gl-src]`
- No changes needed

### 5. Verify `src/app/globals.css`
- Already synced with gallery tokens (`--bg: 8%`, `--fg: 96%`, `--muted: 52%`, etc.)
- Already has gallery utilities (`.glass-card`, `.glass-header`, etc.)
- No changes needed

### 6. Verify `src/app/layout.tsx`
- Already uses CSS variables (`bg-[var(--bg)] text-[var(--fg)]`)
- Already loads Mona Sans via CDN
- No changes needed

## Validation
1. `npm run build` compiles without errors in `src/`
2. `npm run dev` starts successfully
3. Home page (`/`) shows:
   - Fixed glass header with live dot and "ChronoCoder" wordmark
   - Hero with WebGL distortion background
   - Mentor cards with glass caption bars
   - Scroll progress track on the right
   - Section dividers
   - Gallery-style footer
4. Workspace page (`/workspace/[mentorId]`) is completely unchanged
5. All existing navigation links work

## Out of Scope
- Changing workspace page styling
- Modifying backend or API routes
- Adding new features beyond the homepage visual redesign

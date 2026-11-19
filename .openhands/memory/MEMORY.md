# Chronocoder-1 — project memory

## Repo facts
- Default branch is **`master`** (not `main`).
- Merge policy: **squash disabled**; merge commits and rebase allowed. Use
  `gh pr merge N --merge` (not `--squash`).

## CI
- Checks: Backend Lint, Backend Tests (WebSocket contract), Frontend Lint & Build,
  Frontend Tests (Vitest), Docker Build Validation. Watch with
  `gh run watch <id> --exit-status`.
- `next build` reports "Failed to type check" from the `tests/` dir (vitest types
  don't resolve from the root tsconfig). This is pre-existing; `✓ Compiled
  successfully` is the real signal. Check src alone with
  `npx tsc --noEmit` and filter out `^tests/`.
- Frontend suite lives in `tests/` with its own package.json: `cd tests && npm test`.

## Commit trailers
- **Do NOT add any `Co-authored-by:` trailer unless the user asks.** As of
  2026-11-18 the user said to drop the metiquella co-author — "next time use the
  default". Plain commits/merge commits only.
- Pair Extraordinaire is EARNED (bronze x2 on `anubhavaanand`). The badge goes
  to whoever is named in `Co-authored-by:` on a merged PR — the trailer holder,
  not necessarily the git commit author. Both are eligible; the distinction is
  `commit.author` (git --author) vs the trailer. `metiquella` has none because
  its trailers were mostly malformed, not because co-authors can't earn it.
- If a trailer ever IS wanted: pass an explicit `--body` (and `--subject`) to
  `gh pr merge`. Without it GitHub reuses the PR body and **hard-wraps long
  trailer lines**, which breaks parsing. Verify with
  `git fetch -q origin master && git log -1 --format=%B origin/master | cat -A`.

## Frontend gotchas
- `src/components/ui/WebGLBackground.tsx`: images added after mount need
  `ensureLoop()` kicked from the MutationObserver, otherwise their shader
  uniforms never animate. Pointer listeners go on `[data-gl-pointer]`, not the
  `pointer-events: none` img.
- jsdom `update()` frustum-culls off-screen planes — test hosts need explicit
  width/height styles or uniforms stay 0.
- Tests that stub `window.matchMedia` / `rafCallback` leak across cases; a test
  depending on them must install its own and restore in `finally`.
- Append test hosts to `document.body`, not the render container — cleanup
  detaches the container.
- When bulk-stripping debug logs, never use a line filter like `'DBG' not in l`:
  it deletes continuation lines of multi-line calls and corrupts the file.
  Typecheck after any such edit.
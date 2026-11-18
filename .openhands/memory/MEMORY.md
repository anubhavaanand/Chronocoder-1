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

## Co-authored trailers (Pair Extraordinaire goal)
- Always pass an explicit `--body` to `gh pr merge`, and pass `--subject` too.
  Without it GitHub reuses the PR body and **hard-wraps long trailer lines**,
  which breaks parsing.
- Correct form:
  `gh pr merge N --merge --subject "<title> (#N)" --body "<body with one-line trailers>"`
- Verify after merge:
  `git fetch -q origin master && git log -1 --format=%B origin/master | cat -A`
  Each `Co-authored-by:` must be one physical line.
- Trailers must not be italicised (`_Co-authored-by: ..._`) — that is malformed
  at the source and can never count.
- Use the numeric-id form when known:
  `Co-authored-by: metiquella <259600641+metiquella@users.noreply.github.com>`
- Convention in this repo's history also uses the no-ID form
  `metiquella@users.noreply.github.com`; GitHub accepts either as long as the
  address matches a real account.

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
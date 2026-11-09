# ChronoCoder v3 - Comprehensive Issue Report

**Generated:** 2026-11-09  
**Branch:** `kilo/tuned-grid-43d` (merged: distortion-grain-homepage, phase-2-workspace-modernization, jules-gemini-fallback, ux-disabled-buttons, jules-test-improvement, add-utils-tests)  
**Total Issues:** 36 verified issues

---

## 🔴 Critical (5) — Production Blocking

### 1. CORS allows all origins
**File:** `backend/main.py:126`  
**Code:** `allow_origins=["*"]`  
**Risk:** Any website can call your API, enabling CSRF and data theft.  
**Fix:** Restrict to known frontend origins: `allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")]`

### 2. Dev mode JWT bypass
**File:** `backend/main.py:60-62`  
**Code:** Returns `"anonymous"` when `SUPABASE_JWT_SECRET` not set  
**Risk:** Production deployments without JWT secret get zero authentication.  
**Fix:** Fail fast in production: `if not SUPABASE_JWT_SECRET and os.getenv("ENV") == "production": raise RuntimeError("JWT secret required")`

### 3. In-memory rate limiting
**File:** `backend/main.py:40,74-94`  
**Risk:** Rate limit resets on each instance; useless behind load balancer.  
**Fix:** Use Redis-backed rate limiter or Supabase edge functions.

### 4. Missing `DeveloperMessages` module
**File:** `test_utils.py:2`  
**Error:** `ModuleNotFoundError: No module named 'utils'`  
**Fix:** Either create `backend/utils/__init__.py` with `DeveloperMessages` or remove/update the test.

### 5. WebSocket reconnect race condition
**File:** `src/hooks/useMentorWebSocket.ts:136-149`  
**Risk:** `pendingRequest` may be stale after reconnect; feedback chunks lost.  
**Fix:** Store request in `sessionRef` and re-send on reconnect with fresh session ID.

---

## 🟡 High (10) — User Experience / Reliability

### 6. Hardcoded mentor redirect in SearchBar
**File:** `src/components/ui/SearchBar.tsx:19`  
**Code:** `router.push(\`/workspace/ada_lovelace?query=...\`)`  
**Impact:** Always redirects to Ada Lovelace regardless of context.  
**Fix:** Accept `defaultMentorId` prop or read from URL/context.

### 7. Avatar filename mismatch
**Location:** `avatars/` vs `public/mentors/`  
**Details:** Root `avatars/` has `Ada Lovelace.jpg.jpg`, `Alan turingjpg.jpg` (spaces, double extensions); `public/mentors/` has correct `ada_lovelace.jpg`, `alan_turing.jpg`.  
**Impact:** Broken images if root avatars used.  
**Fix:** Delete `avatars/` or rename to match `public/mentors/`.

### 8. Monaco editor fallback uses undefined CSS classes
**File:** `src/app/workspace/[mentorId]/page.tsx:20`  
**Classes:** `bg-retro-darker`, `border-retro-border` — not in Tailwind v4 config (only CSS vars exist).  
**Impact:** Loading state has no styling.  
**Fix:** Use `style={{ background: 'var(--retro-darker)', border: '1px solid var(--retro-border)' }}` or add to `@theme inline`.

### 9. `btoa` not polyfilled
**File:** `src/components/mentor/HeroDistortion.tsx:36,88`  
**Risk:** `btoa` unavailable in Node.js / Web Workers / some browsers.  
**Fix:** Add polyfill: `const btoaPolyfill = (str) => Buffer.from(str).toString('base64')` or use `base64-js`.

### 10. AI streaming partial JSON handling may drop chunks
**File:** `backend/services/ai_service.py:191-208`  
**Risk:** `json.JSONDecoder().raw_decode` stops at first parse error; remaining buffer discarded.  
**Fix:** Accumulate buffer across chunks; only yield complete objects; log parse failures.

### 11. Session persistence lacks Authorization header
**File:** `src/app/workspace/[mentorId]/page.tsx:106-116`  
**Impact:** Sessions created anonymously; not linked to authenticated user.  
**Fix:** Read Supabase session token and include: `headers: { Authorization: \`Bearer \${session.access_token}\` }`

### 12. No WebSocket input sanitization
**File:** `backend/main.py:191-207`  
**Risk:** Only checks `mentor_id` and `user_code` presence; no length limits, no XSS filtering.  
**Fix:** Add Pydantic model with `max_length`, sanitize code input.

### 13. Missing React error boundaries
**Location:** `src/app/` — no `error.tsx` or class error boundaries  
**Impact:** Any component crash whitescreens entire page.  
**Fix:** Add `src/app/error.tsx` and wrap critical sections.

### 14. No request timeout on backend calls
**File:** `src/app/api/sessions/route.ts:15-22`  
**Risk:** `fetch` hangs indefinitely if backend unreachable.  
**Fix:** Add `AbortController` with 10s timeout.

### 15. Supabase service role key referenced in frontend build context
**File:** `backend/db/session_repo.py:57`  
**Risk:** If `SUPABASE_SERVICE_ROLE_KEY` accidentally exposed to client bundle.  
**Fix:** Ensure only used in backend; add `.env.production` with only anon key for frontend.

---

## 🟠 Medium (10) — Code Quality / Maintainability

### 16. Unused `useRef` import
**File:** `src/app/workspace/[mentorId]/page.tsx:3`

### 17. Missing `handleSubmit` dependency in useEffect
**File:** `src/app/workspace/[mentorId]/page.tsx:176`  
**Warning:** `React Hook useEffect has a missing dependency: 'handleSubmit'`

### 18. Unused `prefersReduced` variable
**File:** `src/components/ui/WebGLBackground.tsx:320`

### 19. `<img>` instead of Next.js `<Image>` (6 instances)
**Files:**  
- `src/app/workspace/[mentorId]/page.tsx:192`
- `src/components/mentor/HeroDistortion.tsx:42,91`
- `src/components/ui/WebGLBackground.tsx` (canvas, not img)
**Impact:** No automatic optimization, LCP penalty.  
**Fix:** Use `<Image />` with `fill` or explicit dimensions.

### 20. Duplicate feedback content computation
**File:** `src/app/workspace/[mentorId]/page.tsx:73,141`  
**Code:** Identical `feedbackContent` computed in `useMemo` and `handleExport`.

### 21. Hardcoded complexity thresholds
**File:** `src/app/workspace/[mentorId]/page.tsx:58-64`  
**Values:** `<100` Simple, `<500` Medium, else Complex — not configurable.

### 22. WebSocket URL hardcoded with fallback
**File:** `src/hooks/useMentorWebSocket.ts:88`  
**Code:** `process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"`  
**Fix:** Centralize in config module; validate at startup.

### 23. No TypeScript strict null checks on mentor access
**File:** `src/app/workspace/[mentorId]/page.tsx:34`  
**Code:** `MENTORS[mentorId] || MENTORS.ada_lovelace` — silent fallback masks invalid IDs.

### 24. Monaco editor options hardcoded
**File:** `src/app/workspace/[mentorId]/page.tsx:420-432`  
**Impact:** Cannot customize font size, theme, etc. per user preference.

### 25. Missing loading skeleton for mentor cards
**File:** `src/components/mentor/MentorCard.tsx`  
**Impact:** Layout shift when images load; no placeholder.

---

## 🟢 Low (11) — Polish / Accessibility

### 26. Missing `aria-live` on streaming feedback
**File:** `src/app/workspace/[mentorId]/page.tsx:331`  
**Impact:** Screen readers won't announce incoming feedback chunks.

### 27. Tab buttons lack `aria-selected` and `role="tab"`
**File:** `src/app/workspace/[mentorId]/page.tsx:255-280`  
**Fix:** Add `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`.

### 28. No focus management on tab switch
**File:** `src/app/workspace/[mentorId]/page.tsx:255-280`  
**Impact:** Keyboard users lose focus when switching tabs.

### 29. Export filename uses mentor.id directly
**File:** `src/app/workspace/[mentorId]/page.tsx:158`  
**Risk:** Special characters in ID could break filesystem/download.

### 30. Console.warn/error in production code (3 instances)
**Files:**  
- `src/app/workspace/[mentorId]/page.tsx:118`
- `src/hooks/useMentorWebSocket.ts:124,127`  
**Fix:** Use structured logger; strip in production build.

### 31. CSS `text-accent-green/amber/magenta` classes may not exist
**File:** `src/app/workspace/[mentorId]/page.tsx:60-62`  
**Check:** Tailwind v4 only generates classes for `--color-*` in `@theme inline`; these use `--accent-*` vars directly.

### 32. No unit tests for frontend components
**Location:** `tests/`, `backend/tests/` — only 1 backend test file (`test_ws_contract.py`)  
**Impact:** No regression protection for UI logic.

### 33. Docker healthcheck uses `curl` which may not exist
**File:** `docker/Dockerfile.frontend:22`  
**Fix:** `apk add --no-cache curl` already present — verify it's in production stage.

### 34. Frontend Dockerfile copies `node_modules` twice
**File:** `docker/Dockerfile.frontend:27-28`  
**Lines:** `COPY --from=builder /app/node_modules ./node_modules` and `COPY --from=deps /app/node_modules ./node_modules`

### 35. Backend Dockerfile copies entire `backend/` including tests
**File:** `docker/Dockerfile.backend:31`  
**Fix:** Use `.dockerignore` or copy only `backend/main.py`, `backend/services/`, `backend/utils/`, `backend/mentors/`.

### 36. Fly.io config only deploys frontend
**File:** `fly.toml:6`  
**Config:** `dockerfile = "docker/Dockerfile.frontend"` — no backend service defined.

---

## 📋 Additional Findings (Not Counted in 36)

| Area | Issues |
|------|--------|
| **Supabase Schema** | No migration files found — schema drift risk |
| **Environment Validation** | No startup validation of required env vars |
| **Logging** | No structured logging in backend (only `print`) |
| **Monitoring** | No metrics/observability endpoints |
| **Documentation** | No API docs beyond `/api/docs` (Swagger) |

---

## Import Instructions

### Option A: GitHub CLI (bulk create)
```bash
# Requires GH_TOKEN with repo scope
gh issue create --title "[CRITICAL] CORS allows all origins" --body-file <(cat <<'EOF'
**File:** backend/main.py:126
**Code:** allow_origins=["*"]
**Risk:** Any website can call your API...
EOF
)
# Repeat for each issue
```

### Option B: GitHub Web UI
1. Go to repo → Issues → New issue
2. Copy title/body from this markdown
3. Add labels: `critical`/`high`/`medium`/`low`, `frontend`/`backend`/`devops`

### Option C: Import via GitHub Projects (CSV)
Export this table as CSV and import to GitHub Projects.

---

## Suggested Priority Order

1. **Critical 1-5** — Security/reliability blockers
2. **High 6-15** — User-facing bugs
3. **Medium 16-25** — Code quality
4. **Low 26-36** — Polish/a11y
5. **Additional** — Infrastructure/debt

---

*Report generated by Kilo Code agent during deep code review.*
#!/bin/bash
# GitHub Issues Bulk Creator for ChronoCoder v3
# Usage: GH_TOKEN=ghp_xxxxx ./create_issues.sh
# Requires: gh CLI installed and authenticated

set -e

REPO="anubhavaanand/Chronocoder-1"  # Update if different

if [ -z "$GH_TOKEN" ]; then
  echo "Error: GH_TOKEN environment variable not set"
  echo "Usage: GH_TOKEN=ghp_xxxxx ./create_issues.sh"
  exit 1
fi

echo "Creating issues for $REPO..."

# Function to create an issue
create_issue() {
  local title="$1"
  local body="$2"
  local labels="$3"
  
  gh issue create \
    --repo "$REPO" \
    --title "$title" \
    --body "$body" \
    --label "$labels"
}

# ==================== CRITICAL ====================

create_issue \
  "[CRITICAL] CORS allows all origins" \
  "**File:** \`backend/main.py:126\`  
**Code:** \`allow_origins=[\"*\"]\`  
**Risk:** Any website can call your API, enabling CSRF and data theft.  
**Fix:** Restrict to known frontend origins: \`allow_origins=[os.getenv(\"FRONTEND_URL\", \"http://localhost:3000\")]\`" \
  "critical,backend,security"

create_issue \
  "[CRITICAL] Dev mode JWT bypass in production" \
  "**File:** \`backend/main.py:60-62\`  
**Code:** Returns \`\"anonymous\"\` when \`SUPABASE_JWT_SECRET\` not set  
**Risk:** Production deployments without JWT secret get zero authentication.  
**Fix:** Fail fast in production: \`if not SUPABASE_JWT_SECRET and os.getenv(\"ENV\") == \"production\": raise RuntimeError(\"JWT secret required\")\`" \
  "critical,backend,auth"

create_issue \
  "[CRITICAL] In-memory rate limiting doesn't work at scale" \
  **File:** \`backend/main.py:40,74-94\`  
**Risk:** Rate limit resets on each instance; useless behind load balancer.  
**Fix:** Use Redis-backed rate limiter or Supabase edge functions." \
  "critical,backend,scaling"

create_issue \
  "[CRITICAL] Test suite imports non-existent DeveloperMessages module" \
  **File:** \`test_utils.py:2\`  
**Error:** \`ModuleNotFoundError: No module named 'utils'\`  
**Fix:** Either create \`backend/utils/__init__.py\` with \`DeveloperMessages\` or remove/update the test." \
  "critical,backend,testing"

create_issue \
  "[CRITICAL] WebSocket reconnect race condition loses feedback chunks" \
  **File:** \`src/hooks/useMentorWebSocket.ts:136-149\`  
**Risk:** \`pendingRequest\` may be stale after reconnect; feedback chunks lost.  
**Fix:** Store request in \`sessionRef\` and re-send on reconnect with fresh session ID." \
  "critical,frontend,websocket"

# ==================== HIGH ====================

create_issue \
  "[HIGH] Hardcoded mentor redirect in SearchBar always goes to Ada Lovelace" \
  **File:** \`src/components/ui/SearchBar.tsx:19\`  
**Code:** \`router.push(\`/workspace/ada_lovelace?query=...\`)\`  
**Impact:** Always redirects to Ada Lovelace regardless of context.  
**Fix:** Accept \`defaultMentorId\` prop or read from URL/context." \
  "high,frontend,ux"

create_issue \
  "[HIGH] Avatar filename mismatch between avatars/ and public/mentors/" \
  **Location:** \`avatars/\` vs \`public/mentors/\`  
**Details:** Root \`avatars/\` has \`Ada Lovelace.jpg.jpg\`, \`Alan turingjpg.jpg\` (spaces, double extensions); \`public/mentors/\` has correct \`ada_lovelace.jpg\`, \`alan_turing.jpg\`.  
**Impact:** Broken images if root avatars used.  
**Fix:** Delete \`avatars/\` or rename to match \`public/mentors/\`." \
  "high,frontend,assets"

create_issue \
  "[HIGH] Monaco editor fallback uses undefined CSS classes" \
  **File:** \`src/app/workspace/[mentorId]/page.tsx:20\`  
**Classes:** \`bg-retro-darker\`, \`border-retro-border\` — not in Tailwind v4 config (only CSS vars exist).  
**Impact:** Loading state has no styling.  
**Fix:** Use \`style={{ background: 'var(--retro-darker)', border: '1px solid var(--retro-border)' }}\` or add to \`@theme inline\`." \
  "high,frontend,styling"

create_issue \
  "[HIGH] btoa not polyfilled - fails in Node/Web Workers" \
  **File:** \`src/components/mentor/HeroDistortion.tsx:36,88\`  
**Risk:** \`btoa\` unavailable in Node.js / Web Workers / some browsers.  
**Fix:** Add polyfill: \`const btoaPolyfill = (str) => Buffer.from(str).toString('base64')\` or use \`base64-js\`." \
  "high,frontend,compatibility"

create_issue \
  "[HIGH] AI streaming partial JSON handling may drop chunks" \
  **File:** \`backend/services/ai_service.py:191-208\`  
**Risk:** \`json.JSONDecoder().raw_decode\` stops at first parse error; remaining buffer discarded.  
**Fix:** Accumulate buffer across chunks; only yield complete objects; log parse failures." \
  "high,backend,ai"

create_issue \
  "[HIGH] Session persistence lacks Authorization header" \
  **File:** \`src/app/workspace/[mentorId]/page.tsx:106-116\`  
**Impact:** Sessions created anonymously; not linked to authenticated user.  
**Fix:** Read Supabase session token and include: \`headers: { Authorization: \`Bearer \${session.access_token}\` }\`" \
  "high,frontend,auth"

create_issue \
  "[HIGH] No WebSocket input sanitization" \
  **File:** \`backend/main.py:191-207\`  
**Risk:** Only checks \`mentor_id\` and \`user_code\` presence; no length limits, no XSS filtering.  
**Fix:** Add Pydantic model with \`max_length\`, sanitize code input." \
  "high,backend,security"

create_issue \
  "[HIGH] Missing React error boundaries" \
  **Location:** \`src/app/\` — no \`error.tsx\` or class error boundaries  
**Impact:** Any component crash whitescreens entire page.  
**Fix:** Add \`src/app/error.tsx\` and wrap critical sections." \
  "high,frontend,reliability"

create_issue \
  "[HIGH] No request timeout on backend calls" \
  **File:** \`src/app/api/sessions/route.ts:15-22\`  
**Risk:** \`fetch\` hangs indefinitely if backend unreachable.  
**Fix:** Add \`AbortController\` with 10s timeout." \
  "high,frontend,reliability"

create_issue \
  "[HIGH] Supabase service role key referenced in frontend build context" \
  **File:** \`backend/db/session_repo.py:57\`  
**Risk:** If \`SUPABASE_SERVICE_ROLE_KEY\` accidentally exposed to client bundle.  
**Fix:** Ensure only used in backend; add \`.env.production\` with only anon key for frontend." \
  "high,backend,security"

# ==================== MEDIUM ====================

create_issue \
  "[MEDIUM] Unused useRef import" \
  **File:** \`src/app/workspace/[mentorId]/page.tsx:3\`" \
  "medium,frontend,lint"

create_issue \
  "[MEDIUM] Missing handleSubmit dependency in useEffect" \
  **File:** \`src/app/workspace/[mentorId]/page.tsx:176\`  
**Warning:** \`React Hook useEffect has a missing dependency: 'handleSubmit'\`" \
  "medium,frontend,lint"

create_issue \
  "[MEDIUM] Unused prefersReduced variable" \
  **File:** \`src/components/ui/WebGLBackground.tsx:320\`" \
  "medium,frontend,lint"

create_issue \
  "[MEDIUM] Using <img> instead of Next.js <Image> (6 instances)" \
  **Files:**  
- \`src/app/workspace/[mentorId]/page.tsx:192\`  
- \`src/components/mentor/HeroDistortion.tsx:42,91\`  
**Impact:** No automatic optimization, LCP penalty.  
**Fix:** Use \`<Image />\` with \`fill\` or explicit dimensions." \
  "medium,frontend,performance"

create_issue \
  "[MEDIUM] Duplicate feedback content computation" \
  **File:** \`src/app/workspace/[mentorId]/page.tsx:73,141\`  
**Code:** Identical \`feedbackContent\` computed in \`useMemo\` and \`handleExport\`." \
  "medium,frontend,code-quality"

create_issue \
  "[MEDIUM] Hardcoded complexity thresholds not configurable" \
  **File:** \`src/app/workspace/[mentorId]/page.tsx:58-64\`  
**Values:** \`<100\` Simple, \`<500\` Medium, else Complex — not configurable." \
  "medium,frontend,config"

create_issue \
  "[MEDIUM] WebSocket URL hardcoded with fallback" \
  **File:** \`src/hooks/useMentorWebSocket.ts:88\`  
**Code:** \`process.env.NEXT_PUBLIC_WS_URL || \"ws://localhost:8000\"\`  
**Fix:** Centralize in config module; validate at startup." \
  "medium,frontend,config"

create_issue \
  "[MEDIUM] No TypeScript strict null checks on mentor access" \
  **File:** \`src/app/workspace/[mentorId]/page.tsx:34\`  
**Code:** \`MENTORS[mentorId] || MENTORS.ada_lovelace\` — silent fallback masks invalid IDs." \
  "medium,frontend,typescript"

create_issue \
  "[MEDIUM] Monaco editor options hardcoded" \
  **File:** \`src/app/workspace/[mentorId]/page.tsx:420-432\`  
**Impact:** Cannot customize font size, theme, etc. per user preference." \
  "medium,frontend,ux"

create_issue \
  "[MEDIUM] Missing loading skeleton for mentor cards" \
  **File:** \`src/components/mentor/MentorCard.tsx\`  
**Impact:** Layout shift when images load; no placeholder." \
  "medium,frontend,ux"

# ==================== LOW ====================

create_issue \
  "[LOW] Missing aria-live on streaming feedback" \
  **File:** \`src/app/workspace/[mentorId]/page.tsx:331\`  
**Impact:** Screen readers won't announce incoming feedback chunks." \
  "low,frontend,accessibility"

create_issue \
  "[LOW] Tab buttons lack aria-selected and role=\"tab\"" \
  **File:** \`src/app/workspace/[mentorId]/page.tsx:255-280\`  
**Fix:** Add \`role=\"tablist\"\`, \`role=\"tab\"\`, \`aria-selected\`, \`aria-controls\`." \
  "low,frontend,accessibility"

create_issue \
  "[LOW] No focus management on tab switch" \
  **File:** \`src/app/workspace/[mentorId]/page.tsx:255-280\`  
**Impact:** Keyboard users lose focus when switching tabs." \
  "low,frontend,accessibility"

create_issue \
  "[LOW] Export filename uses mentor.id directly" \
  **File:** \`src/app/workspace/[mentorId]/page.tsx:158\`  
**Risk:** Special characters in ID could break filesystem/download." \
  "low,frontend,edge-case"

create_issue \
  "[LOW] Console.warn/error in production code (3 instances)" \
  **Files:**  
- \`src/app/workspace/[mentorId]/page.tsx:118\`  
- \`src/hooks/useMentorWebSocket.ts:124,127\`  
**Fix:** Use structured logger; strip in production build." \
  "low,frontend,logging"

create_issue \
  "[LOW] CSS text-accent-green/amber/magenta classes may not exist" \
  **File:** \`src/app/workspace/[mentorId]/page.tsx:60-62\`  
**Check:** Tailwind v4 only generates classes for \`--color-*\` in \`@theme inline\`; these use \`--accent-*\` vars directly." \
  "low,frontend,styling"

create_issue \
  "[LOW] No unit tests for frontend components" \
  **Location:** \`tests/\`, \`backend/tests/\` — only 1 backend test file (\`test_ws_contract.py\`)  
**Impact:** No regression protection for UI logic." \
  "low,frontend,testing"

create_issue \
  "[LOW] Docker healthcheck uses curl which may not exist" \
  **File:** \`docker/Dockerfile.frontend:22\`  
**Fix:** \`apk add --no-cache curl\` already present — verify it's in production stage." \
  "low,devops,docker"

create_issue \
  "[LOW] Frontend Dockerfile copies node_modules twice" \
  **File:** \`docker/Dockerfile.frontend:27-28\`  
**Lines:** \`COPY --from=builder /app/node_modules ./node_modules\` and \`COPY --from=deps /app/node_modules ./node_modules\`" \
  "low,devops,docker"

create_issue \
  "[LOW] Backend Dockerfile copies entire backend/ including tests" \
  **File:** \`docker/Dockerfile.backend:31\`  
**Fix:** Use \`.dockerignore\` or copy only \`backend/main.py\`, \`backend/services/\`, \`backend/utils/\`, \`backend/mentors/\`." \
  "low,devops,docker"

create_issue \
  "[LOW] Fly.io config only deploys frontend" \
  **File:** \`fly.toml:6\`  
**Config:** \`dockerfile = \"docker/Dockerfile.frontend\"\` — no backend service defined." \
  "low,devops,deployment"

echo "All issues created!"
import { NextResponse } from "next/server";

/**
 * Forwards session persistence to the FastAPI backend.
 * The frontend has no direct backend dependency at render time; this
 * route is the single bridge for POST /api/sessions.
 */
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Maximum accepted request body size (bytes). This proxy forwards arbitrary
 * client JSON to the backend, so without a cap a huge body is read fully into
 * memory before being rejected downstream (#223). 256 KB is far above any real
 * session payload (code + feedback) while still bounding memory.
 */
const MAX_BODY_BYTES = 256 * 1024;

/**
 * Build an AbortSignal that fires after `ms`.
 *
 * `AbortSignal.timeout()` is unavailable in older Safari (<16) and some
 * embedded WebViews, where it is `undefined`. Calling it there throws a
 * TypeError and every request 502s (#222). Fall back to an AbortController +
 * setTimeout so the timeout works everywhere.
 */
function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

export async function POST(request: Request) {
  try {
    // Reject oversized bodies up front from the declared Content-Length so a
    // huge payload is never buffered into memory (#223).
    const declaredLength = Number(request.headers.get("content-length") ?? "");
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { code: "PAYLOAD_TOO_LARGE", detail: `Request body exceeds ${MAX_BODY_BYTES} bytes` },
        { status: 413 },
      );
    }

    const body = await request.json();
    const auth = request.headers.get("authorization");

    // Also enforce the cap on the actual bytes, for chunked requests that omit
    // Content-Length. Serialise once and measure.
    const serialized = JSON.stringify(body);
    if (serialized.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { code: "PAYLOAD_TOO_LARGE", detail: `Request body exceeds ${MAX_BODY_BYTES} bytes` },
        { status: 413 },
      );
    }

    const res = await fetch(`${BACKEND_URL}/api/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: auth } : {}),
      },
      body: serialized,
      signal: timeoutSignal(5000),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { status: "backend_unreachable", detail: "Could not reach the ChronoCoder backend" },
      { status: 502 }
    );
  }
}

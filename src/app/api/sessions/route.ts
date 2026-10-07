import { NextResponse } from "next/server";

/**
 * Forwards session persistence to the FastAPI backend.
 * The frontend has no direct backend dependency at render time; this
 * route is the single bridge for POST /api/sessions.
 */
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const auth = request.headers.get("authorization");

    const res = await fetch(`${BACKEND_URL}/api/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: auth } : {}),
      },
      body: JSON.stringify(body),
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

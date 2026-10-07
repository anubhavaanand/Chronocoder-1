import { NextResponse } from "next/server";

/**
 * Health endpoint for container healthchecks (Dockerfile, docker-compose,
 * fly.toml all poll GET /health). Returns the build's status with no auth.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "chronocoder-frontend",
    timestamp: new Date().toISOString(),
  });
}

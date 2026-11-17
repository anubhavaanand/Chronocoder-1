import type { NextConfig } from "next";

/**
 * Content-Security-Policy for ChronoCoder.
 *
 * The app loads:
 *  - fonts from fonts.cdnfonts.com (Mona Sans) — see src/app/layout.tsx
 *  - the Monaco editor, which uses blob: workers and eval for its language
 *    services, and is loaded from a CDN by @monaco-editor/react by default
 *  - the feedback WebSocket to NEXT_PUBLIC_WS_URL (ws:/wss:)
 *
 * `unsafe-eval` and `blob:` are required by Monaco; `unsafe-inline` is
 * required for Next.js's inline runtime + inline styles used across the UI.
 * This is still a meaningful baseline (blocks arbitrary remote scripts).
 */
const csp = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; Monaco needs eval for its workers.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
  // Inline styles are used extensively via the style prop.
  "style-src 'self' 'unsafe-inline' https://fonts.cdnfonts.com",
  "font-src 'self' https://fonts.cdnfonts.com data:",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  // Monaco web workers.
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "connect-src 'self' ws: wss: https://cdn.jsdelivr.net",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: csp,
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        // Apply to all routes.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
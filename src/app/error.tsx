"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Route-level error boundary for the App Router.
 *
 * Must be a Client Component: Next.js passes an `error` and a `reset`
 * callback, and only client components can render recovery UI. Errors thrown
 * in a server component below this segment bubble up here instead of
 * producing the generic unstyled Next.js error page.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error in the browser console; the message is intentionally
    // not rendered, since server error details can be sensitive.
    console.error(error);
  }, [error]);

  return (
    <main
      id="main"
      tabIndex={-1}
      className="relative flex min-h-screen items-center justify-center px-6"
    >
      <div className="glass-card w-full max-w-xl px-8 py-12 text-center">
        <p
          className="text-[10px] uppercase"
          style={{ color: "var(--muted)", letterSpacing: "0.2em", fontFamily: "var(--font-mono)" }}
        >
          Something went wrong
        </p>
        <h1 className="mt-4 text-3xl font-black">The archive hit an error</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--muted)" }}>
          The request failed before it could finish. Retrying often clears it;
          if it persists, head back to the home page.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-gradient-primary px-8 py-4 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-neon"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-xl px-8 py-4 text-sm font-semibold transition-all duration-200 hover:text-[oklch(72%_0.18_165)]"
            style={{ color: "var(--muted)" }}
          >
            Back to the archive
          </Link>
        </div>
      </div>
    </main>
  );
}
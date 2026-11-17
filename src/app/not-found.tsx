import Link from "next/link";

/**
 * Custom 404 boundary for the App Router.
 *
 * `notFound()` is called from the workspace route when a mentor id does not
 * resolve (see src/app/workspace/[mentorId]/page.tsx), and without this file
 * Next.js renders its unstyled default 404 page.
 */
export default function NotFound() {
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
          Error 404
        </p>
        <h1 className="mt-4 text-4xl font-black">Not in the archive</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--muted)" }}>
          That page doesn&apos;t exist. The mentor you&apos;re looking for may
          have moved, or the link was mistyped.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-xl bg-gradient-primary px-8 py-4 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-neon"
        >
          Back to the archive
        </Link>
      </div>
    </main>
  );
}
/**
 * Route-level Suspense fallback for the workspace.
 *
 * The workspace is a client component that pulls in the Monaco editor
 * (a large, client-only bundle) and then streams feedback, so the first
 * navigation shows nothing until the JS arrives. This skeleton mirrors the
 * real layout — header row, tab strip, editor panel — to avoid a blank
 * screen.
 *
 * `id="main"` keeps the skip link (#94) resolvable while the fallback is
 * showing.
 */
export default function WorkspaceLoading() {
  const bar = "rounded bg-[var(--surface-hi)]";

  return (
    <main
      id="main"
      tabIndex={-1}
      aria-busy="true"
      aria-label="Loading workspace"
      className="min-h-screen bg-[var(--bg)]"
    >
      <div className="border-b border-[var(--border)] bg-retro-darker/80">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className={`h-4 w-40 ${bar} animate-pulse`} />
          <div className="flex items-center gap-4">
            <div className={`h-9 w-24 ${bar} animate-pulse`} />
            <div className={`h-9 w-28 ${bar} animate-pulse`} />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className={`mx-auto mb-8 h-12 max-w-[800px] ${bar} animate-pulse rounded-xl`} />

        <div className="mb-6 flex gap-6 border-b border-[var(--border)]">
          <div className={`h-6 w-28 ${bar} animate-pulse`} />
          <div className={`h-6 w-24 ${bar} animate-pulse`} />
        </div>

        <div className="rounded-lg border border-[var(--border)] p-4">
          <div className="space-y-3">
            <div className={`h-3 w-11/12 ${bar} animate-pulse`} />
            <div className={`h-3 w-9/12 ${bar} animate-pulse`} />
            <div className={`h-3 w-10/12 ${bar} animate-pulse`} />
            <div className={`h-3 w-7/12 ${bar} animate-pulse`} />
          </div>
        </div>
      </div>

      <span className="sr-only" role="status">
        Loading workspace
      </span>
    </main>
  );
}
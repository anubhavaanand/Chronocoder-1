/**
 * Shared Cmd/Ctrl+K handler registry.
 *
 * Multiple SearchBar instances can be mounted at once (e.g. a page-level bar
 * and a modal bar). Each one used to add its own `window` keydown listener,
 * so a single keypress fired every handler (#204).
 *
 * This module keeps a single global listener alive and delegates to the most
 * recently registered handler (the topmost/last-mounted search bar). When the
 * registry empties, the listener is removed.
 */

type ShortcutHandler = () => void;

// Ordering matters: the last registered handler wins, matching "most recently
// mounted" semantics (a modal opened after the page bar should take priority).
const handlers: ShortcutHandler[] = [];

let listenerAttached = false;

function handleKeyDown(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    // Only the active (last registered) handler should react.
    const active = handlers[handlers.length - 1];
    if (!active) return;
    event.preventDefault();
    active();
  }
}

/**
 * Register a handler for the global Cmd/Ctrl+K shortcut.
 * Returns an unregister function for cleanup.
 */
export function registerSearchShortcut(handler: ShortcutHandler): () => void {
  handlers.push(handler);

  if (!listenerAttached && typeof window !== "undefined") {
    window.addEventListener("keydown", handleKeyDown);
    listenerAttached = true;
  }

  return () => unregisterSearchShortcut(handler);
}

/** Remove a previously registered handler. */
export function unregisterSearchShortcut(handler: ShortcutHandler): void {
  const index = handlers.lastIndexOf(handler);
  if (index === -1) return;
  handlers.splice(index, 1);

  if (handlers.length === 0 && listenerAttached && typeof window !== "undefined") {
    window.removeEventListener("keydown", handleKeyDown);
    listenerAttached = false;
  }
}

/** Test helper: number of currently registered handlers. */
export function getSearchShortcutCount(): number {
  return handlers.length;
}

/** Test helper: clear all handlers and detach the global listener. */
export function resetSearchShortcuts(): void {
  handlers.length = 0;
  if (listenerAttached && typeof window !== "undefined") {
    window.removeEventListener("keydown", handleKeyDown);
    listenerAttached = false;
  }
}
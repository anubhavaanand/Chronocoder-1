"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function canQuery(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

function subscribe(onChange: () => void): () => void {
  if (!canQuery()) return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return canQuery() ? window.matchMedia(QUERY).matches : false;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Tracks the user's reduced-motion preference and keeps it current.
 *
 * A plain `window.matchMedia(...).matches` read at render time is stale for
 * the lifetime of the component, so this subscribes to the `change` event and
 * re-renders when the OS setting is toggled while the page is open.
 *
 * Implemented with `useSyncExternalStore` so the media query is the single
 * source of truth: no state to keep in sync, no `setState` inside an effect,
 * and a stable `false` server snapshot for SSR.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
// Subscribes to a CSS media query via matchMedia. Same
// useSyncExternalStore-on-matchMedia pattern as info-tooltip.tsx's coarse-
// pointer check, generalized to any query string — React's documented way
// to read a browser-only media query without a "setState in effect" lint
// violation or a hydration mismatch (the server snapshot always reports
// false, corrected client-side on mount).
"use client";

import { useSyncExternalStore } from "react";

function subscribe(query: string) {
  return (callback: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener("change", callback);
    return () => mq.removeEventListener("change", callback);
  };
}

function getServerSnapshot() {
  return false;
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribe(query),
    () => window.matchMedia(query).matches,
    getServerSnapshot,
  );
}

// Subscribes to a CSS media query via matchMedia. Same
// useSyncExternalStore-on-matchMedia pattern as info-tooltip.tsx's coarse-
// pointer check, generalized to any query string — React's documented way
// to read a browser-only media query without a "setState in effect"
// violation or a hydration mismatch (the server snapshot always reports
// false, corrected client-side on mount).
"use client";

import { useCallback, useSyncExternalStore } from "react";

function getServerSnapshot() {
  return false;
}

export function useMediaQuery(query: string): boolean {
  // subscribe/getSnapshot must be stable per query, not recreated every
  // render (info-tooltip.tsx's version is parameter-free, so its versions
  // are already stable module-level functions) — useSyncExternalStore
  // resubscribes whenever the subscribe function's identity changes, and
  // a fresh closure every render can prevent the initial server→client
  // correction from ever landing, leaving the server's `false` snapshot
  // stuck even once the real value is true.
  const subscribe = useCallback(
    (callback: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", callback);
      return () => mq.removeEventListener("change", callback);
    },
    [query],
  );
  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

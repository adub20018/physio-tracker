// Subscribes to a CSS media query via matchMedia. Same
// useSyncExternalStore-on-matchMedia pattern as info-tooltip.tsx's coarse-
// pointer check, generalized to any query string — React's documented way
// to read a browser-only media query without a "setState in effect" lint
// violation or a hydration mismatch (the server snapshot always reports
// false, corrected client-side on mount).
"use client";

import { useCallback, useSyncExternalStore } from "react";

function getServerSnapshot() {
  return false;
}

export function useMediaQuery(query: string): boolean {
  // Both callbacks must keep a stable identity across renders, keyed only
  // on `query`. useSyncExternalStore re-subscribes whenever `subscribe`
  // changes identity, so an inline arrow here would tear down and rebuild
  // the listener on every single render — and any render that happens
  // between those two steps reads through a listener that isn't attached
  // yet, which is how this ended up stuck reporting the server's `false`
  // (mobile layout) on a 1280px-wide desktop viewport.
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// Subscribes to a CSS media query via matchMedia, useSyncExternalStore-based to avoid a
// hydration mismatch (server snapshot always reports false, corrected client-side on mount).
"use client";

import { useCallback, useSyncExternalStore } from "react";

function getServerSnapshot() {
  return false;
}

export function useMediaQuery(query: string): boolean {
  // Must keep a stable identity across renders (keyed on `query`) — an inline arrow would
  // rebuild the listener every render, which previously left it stuck reporting `false`.
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

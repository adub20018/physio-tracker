"use client";

// Range state backed by localStorage under `key`, so each page (dashboard,
// insights) remembers its own last-picked range independently — "remember
// my last choice", not a shareable link, per what this app actually wants.
//
// Built on useSyncExternalStore rather than useState+useEffect: reading
// localStorage during the component body would mismatch the server-rendered
// HTML (localStorage doesn't exist on the server), and correcting it from
// an effect is exactly the "setState synchronously inside an effect" pattern
// React's own lint rules warn against. useSyncExternalStore is the built-in
// answer to "read an external, possibly-absent-on-the-server value safely":
// it renders `getServerSnapshot` during SSR and hydration, then switches to
// the real localStorage value right after — the same one-time correction,
// without the effect/setState pattern.
import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_TIME_RANGE, parseTimeRange, type TimeRange } from "./time-range";

// One listener set per storage key, so multiple subscribers to the same key
// (e.g. React re-subscribing under StrictMode) all get notified on update —
// the native `storage` event won't do this, since it only fires in OTHER
// tabs, never the tab that made the write.
const listenersByKey = new Map<string, Set<() => void>>();

function listenersFor(key: string): Set<() => void> {
  let set = listenersByKey.get(key);
  if (!set) {
    set = new Set();
    listenersByKey.set(key, set);
  }
  return set;
}

function subscribe(key: string) {
  return (callback: () => void) => {
    const set = listenersFor(key);
    set.add(callback);
    return () => set.delete(callback);
  };
}

function getServerSnapshot(): TimeRange {
  return DEFAULT_TIME_RANGE;
}

export function usePersistedTimeRange(
  storageKey: string,
): [TimeRange, (range: TimeRange) => void] {
  const range = useSyncExternalStore(
    subscribe(storageKey),
    () => parseTimeRange(localStorage.getItem(storageKey) ?? undefined),
    getServerSnapshot,
  );

  const update = useCallback(
    (next: TimeRange) => {
      localStorage.setItem(storageKey, next);
      listenersFor(storageKey).forEach((notify) => notify());
    },
    [storageKey],
  );

  return [range, update];
}

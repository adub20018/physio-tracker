"use client";

// Range state backed by localStorage under `key` (per-page "remember my last choice", not
// shareable). Uses useSyncExternalStore, not useState+useEffect, to avoid an SSR/hydration mismatch.
import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_TIME_RANGE, parseTimeRange, type TimeRange } from "./time-range";

// One listener set per storage key so multiple subscribers to the same key all get
// notified on update — the native `storage` event only fires in OTHER tabs, never this one.
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

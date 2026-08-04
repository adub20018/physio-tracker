// Works around a real gap in recharts v3's touch handling: a mouse-driven
// tooltip clears correctly on `mouseleave`, but a touch-driven one has no
// equivalent clearing path at all (confirmed by reading
// node_modules/recharts/es6/state/touchEventsMiddleware.js — its handler
// only ever *sets* the active tooltip index on touchmove, never clears
// it). So on mobile, touching a data point activates its tooltip, and if
// that touch turns into a scroll (the finger drags to pan the page), the
// touchmove events either stop reaching the chart or the browser fires no
// event recharts listens for at all — the tooltip is left permanently
// "active" in recharts' internal state, and stays stuck showing the
// last-touched point.
//
// The fix uses recharts' own documented, version-stable escape hatch:
// <Tooltip active={false}> forces the tooltip closed at render time
// regardless of what stale interaction state recharts is still holding
// internally. The tricky part is knowing WHEN it's safe to stop
// overriding and trust recharts' own state again — this override never
// actually clears recharts' internal state, it only hides the render, so
// the moment the override is lifted, whatever stale state recharts still
// has would reappear.
//
// An earlier version of this hook un-suppressed globally on the next
// touchstart/mousemove anywhere on the page. That was wrong: since
// recharts' stale state is never cleared, un-suppressing GLOBALLY let a
// tap on a completely unrelated chart (or even a non-chart element)
// reactivate a DIFFERENT chart's stuck tooltip — the exact "it just keeps
// popping up, even off the chart" symptom. The only trustworthy signal
// that a chart's own state is fresh again is a genuine, deliberate tap ON
// THAT SPECIFIC CHART — which is also the only thing that gives recharts a
// new, currently-relevant value to render in the first place. So
// suppression is now tracked per chart instance, not globally.
"use client";

import { useState, useSyncExternalStore } from "react";

// --- Global "is the page currently (or was just) mid-scroll" signal ---
// This part IS shared across every chart: a scroll happening anywhere is a
// legitimate reason to hide every visible tooltip, regardless of which
// chart it's over. Auto-clears a short debounce after scrolling stops —
// safe to do blindly here, since clearing this global flag does NOT by
// itself make any chart trust recharts' state again (see per-chart state
// below); it only stops treating brand-new interactions as "mid-scroll."
let isScrolling = false;
const scrollListeners = new Set<() => void>();
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function setIsScrolling(next: boolean) {
  if (isScrolling === next) return;
  isScrolling = next;
  scrollListeners.forEach((notify) => notify());
}

function handleScrollActivity() {
  setIsScrolling(true);
  if (debounceTimer != null) clearTimeout(debounceTimer);
  // 150ms of no further scroll/touchmove activity = scrolling has settled.
  debounceTimer = setTimeout(() => setIsScrolling(false), 150);
}

let globalListenersAttached = false;
function ensureGlobalListeners() {
  if (globalListenersAttached) return;
  globalListenersAttached = true;

  // capture: true — the native `scroll` event doesn't bubble, so a
  // listener on `document` only hears it at all if attached for the
  // capture phase (which does see events dispatched on any descendant,
  // bubbling or not). Needed to catch scrolling inside a nested
  // scrollable container too, not just the whole page.
  document.addEventListener("scroll", handleScrollActivity, {
    capture: true,
    passive: true,
  });
  // Fires the instant a touch starts moving, before the browser has even
  // committed to treating it as a page scroll — the fastest signal
  // available that "this might not be a tap."
  document.addEventListener("touchmove", handleScrollActivity, {
    capture: true,
    passive: true,
  });
}

function subscribe(onStoreChange: () => void): () => void {
  ensureGlobalListeners();
  scrollListeners.add(onStoreChange);
  return () => scrollListeners.delete(onStoreChange);
}

function getSnapshot(): boolean {
  return isScrolling;
}

function getServerSnapshot(): boolean {
  return false;
}

function useIsPageScrolling(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// --- Per-chart suppression state ---
// One call per chart component (not per panel — a multi-panel chart shares
// one call, applied to every panel's Tooltip and every panel's onClick, so
// a tap on any panel un-suppresses the whole synced chart).
//
// `suppressed` should be true if the page is scrolling right now, OR if it
// was scrolling at some point since this chart last received a genuine
// tap (tracked via needsFreshTap). "Adjusting state when a prop changes"
// during render (comparing against a stored previous value), per React's
// own documented pattern for this — not an effect, which would call
// setState after an extra commit for no benefit here and trips the
// project's set-state-in-effect lint rule for no real reason.
export function useChartTooltipSuppression(): {
  suppressed: boolean;
  onChartClick: () => void;
} {
  const isPageScrolling = useIsPageScrolling();
  const [needsFreshTap, setNeedsFreshTap] = useState(false);
  const [prevIsPageScrolling, setPrevIsPageScrolling] = useState(isPageScrolling);

  if (isPageScrolling !== prevIsPageScrolling) {
    setPrevIsPageScrolling(isPageScrolling);
    if (isPageScrolling) {
      setNeedsFreshTap(true);
    }
  }

  return {
    // Pass to <Tooltip active={suppressed ? false : undefined}>.
    suppressed: isPageScrolling || needsFreshTap,
    // Attach to every panel's chart element (onClick={onChartClick}) —
    // browsers only fire click after a tap, not a drag/scroll, so this is
    // recharts' own tap-vs-drag distinction, not something reimplemented
    // here. Firing anywhere within this chart is enough; it doesn't need
    // to land on a specific data point.
    onChartClick: () => setNeedsFreshTap(false),
  };
}

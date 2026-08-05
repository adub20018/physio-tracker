// recharts v3 gap: touch has no tooltip-clearing path (only mouseleave clears it), so on
// dismissal we force `active={false}` AND dispatch a real `mouseout` on `.recharts-wrapper` to clear its internal highlight state; `accessibilityLayer={false}` also drops the a11y focus ring.
"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";

// Global "is the page scrolling" signal, shared across every chart.
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
  debounceTimer = setTimeout(() => setIsScrolling(false), 150);
}

let scrollListenersAttached = false;
function ensureScrollListeners() {
  if (scrollListenersAttached) return;
  scrollListenersAttached = true;
  // `scroll` only, not `touchmove` — touchmove jitter from a normal tap was
  // being misread as scrolling. capture: true since `scroll` doesn't bubble.
  document.addEventListener("scroll", handleScrollActivity, {
    capture: true,
    passive: true,
  });
}

function subscribeScrolling(onStoreChange: () => void): () => void {
  ensureScrollListeners();
  scrollListeners.add(onStoreChange);
  return () => scrollListeners.delete(onStoreChange);
}
function getScrollingSnapshot(): boolean {
  return isScrolling;
}
function getScrollingServerSnapshot(): boolean {
  return false;
}
function useIsPageScrolling(): boolean {
  return useSyncExternalStore(
    subscribeScrolling,
    getScrollingSnapshot,
    getScrollingServerSnapshot,
  );
}

// Registry of mounted charts so a tap outside one's container dismisses just that chart
// (a scroll dismisses all of them via the signal above).
type Registration = { container: () => HTMLElement | null; dismiss: () => void };
const registry = new Set<Registration>();

let clickListenerAttached = false;
function ensureClickListener() {
  if (clickListenerAttached) return;
  clickListenerAttached = true;
  document.addEventListener("click", (e) => {
    const target = e.target as Node | null;
    registry.forEach((entry) => {
      const el = entry.container();
      if (el && target && !el.contains(target)) {
        entry.dismiss();
      }
    });
  });
}

// Dispatches a real mouseout on every `.recharts-wrapper` in the container — multi-panel
// charts have one recharts instance per panel, each with its own stuck state to clear.
function clearRechartsHoverState(container: HTMLElement | null) {
  if (!container) return;
  container.querySelectorAll<HTMLElement>(".recharts-wrapper").forEach((wrapper) => {
    wrapper.dispatchEvent(
      new MouseEvent("mouseout", {
        bubbles: true,
        cancelable: true,
        relatedTarget: document.body,
      }),
    );
  });
}

// One call per chart component (not per panel): attach containerRef to <ResponsiveContainer>
// for a single panel, or the wrapping <div> (e.g. .panelStack) for multi-panel so it reaches every panel.
export function useChartTooltipSuppression<
  T extends HTMLElement = HTMLDivElement,
>(): {
  suppressed: boolean;
  onChartClick: () => void;
  containerRef: RefObject<T | null>;
} {
  const containerRef = useRef<T | null>(null);
  const isPageScrolling = useIsPageScrolling();
  const [needsFreshTap, setNeedsFreshTap] = useState(false);
  const [prevIsPageScrolling, setPrevIsPageScrolling] = useState(isPageScrolling);

  // "Adjust state when a prop changes" during render (React's documented
  // pattern), not an effect — needsFreshTap has its own lifecycle.
  if (isPageScrolling !== prevIsPageScrolling) {
    setPrevIsPageScrolling(isPageScrolling);
    if (isPageScrolling) {
      setNeedsFreshTap(true);
    }
  }

  useEffect(() => {
    if (isPageScrolling) {
      clearRechartsHoverState(containerRef.current);
    }
  }, [isPageScrolling]);

  useEffect(() => {
    ensureClickListener();
    const entry: Registration = {
      container: () => containerRef.current,
      // Only clears this chart's recharts state — arming needsFreshTap here
      // used to suppress every OTHER mounted chart too, not just this one.
      dismiss: () => {
        clearRechartsHoverState(containerRef.current);
      },
    };
    registry.add(entry);
    return () => {
      registry.delete(entry);
    };
  }, []);

  return {
    suppressed: isPageScrolling || needsFreshTap,
    // Browsers only fire click after a tap, not a drag — reuses recharts'
    // own tap-vs-drag distinction.
    onChartClick: () => setNeedsFreshTap(false),
    containerRef,
  };
}

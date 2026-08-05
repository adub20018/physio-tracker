// Works around a real gap in recharts v3's touch handling: a mouse-driven
// tooltip clears correctly on `mouseleave` (which dispatches a
// `mouseLeaveChart()` Redux action, clearing `itemInteraction.hover.active`
// / `axisInteraction.hover.active` — see node_modules/recharts/es6/state/
// tooltipSlice.js), but a touch-driven one has no equivalent path at all:
// `touchEventsMiddleware.js` only ever *sets* that same hover state on
// touchmove, never clears it, and there's no `touchcancel`/`touchend`
// handler wired to clear it either. So on mobile, touching a data point
// activates its tooltip, and if that touch turns into a scroll, or the user
// simply taps away afterward, nothing ever tells recharts the interaction
// ended — the tooltip (and, since `<Bar activeBar>`/Line's active dot read
// that exact same hover state via `selectActiveTooltipIndex`, the
// highlighted bar/dot too) stays stuck showing the last-touched point.
//
// The fix has two parts, both dispatched together whenever a chart should
// be dismissed (the page starts scrolling, or a tap lands outside this
// chart's own container):
//
// 1. `<Tooltip active={false}>` — a documented, render-only override that
//    forces the tooltip's own popup closed regardless of Redux state. Kept
//    as a guaranteed visual fix for the popup specifically, independent of
//    whether the dispatch below is picked up.
// 2. Dispatching a real `mouseout` DOM event (bubbles: true, relatedTarget
//    outside the chart) on the chart's `.recharts-wrapper` element. This
//    actually clears the underlying Redux hover state via recharts' own
//    `mouseLeaveChart()` reducer — which (1) alone can't do, since it's
//    local to the Tooltip component and never dispatches anything — so
//    this is what clears the stuck Bar/Line highlight too. Native
//    `mouseleave` doesn't work here: React 17+ implements its
//    onMouseEnter/onMouseLeave synthetic events on top of native
//    mouseover/mouseout, not native mouseenter/mouseleave.
//
// A third, separate bug: recharts' accessibility layer (on by default)
// makes every chart's root SVG natively focusable (tabIndex=0), so tapping
// it paints the browser's default focus ring — nothing to do with Redux at
// all. Each chart passes `accessibilityLayer={false}` to turn this off
// (see the chart components using this hook).
"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";

// --- Global "is the page currently (or was just) mid-scroll" signal ---
// Shared across every chart: a scroll happening anywhere is a legitimate
// reason to dismiss every chart's tooltip, regardless of which one it's
// over. Auto-clears a short debounce after scrolling stops; safe to do
// blindly, since (unlike the old, flawed version of this hook) clearing
// this flag doesn't by itself make anything reappear — dismissal now
// actually clears each chart's underlying state via the dispatch above,
// it doesn't just hide a render.
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

// --- Global "dismiss any chart whose container wasn't tapped" ---
// Every mounted chart registers its own container + dismiss callback here.
// On any click anywhere, whichever charts' containers DON'T contain the
// click target get dismissed — this is what handles "tap chart, tap away"
// with no scroll involved at all, which the scroll signal above never
// covers on its own.
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

// Actually clears recharts' own Redux hover state (see file header) — for
// every `.recharts-wrapper` found inside the container, dispatches a real,
// bubbling mouseout with a relatedTarget outside the chart, matching what a
// genuine mouse-leaving-the-chart gesture looks like to recharts' own
// listeners. querySelectorAll rather than querySelector on purpose: a
// multi-panel chart (see load-vs-symptoms.tsx etc.) has one fully separate
// recharts instance — and one fully separate stuck-hover-state bug — per
// panel, all sharing a syncId that only broadcasts the active index, not
// the underlying state; clearing just one panel would leave the others'
// own activeBar/active-dot highlighting still stuck. Single-panel charts
// just have one wrapper, so this finds exactly one either way.
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

// One call per chart component (not per panel — a multi-panel chart shares
// one call, applied to every panel's Tooltip/onClick, so a tap on any
// panel un-suppresses the whole synced chart). Only one `containerRef` is
// returned: for a single-panel chart, attach it directly to
// <ResponsiveContainer ref={containerRef}>; for a multi-panel chart,
// attach it instead to the plain <div> wrapping every panel (e.g.
// .panelStack), so clearRechartsHoverState's querySelectorAll reaches
// every panel's own `.recharts-wrapper`, not just one.
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

  // "Adjusting state when a prop changes" during render (React's own
  // documented pattern for this — comparing against a stored previous
  // value) rather than an effect, since needsFreshTap has its own
  // independent lifecycle (also toggled by onChartClick and the
  // click-outside registry below) that can't be simply derived. The actual
  // DOM dispatch is kept out of this block deliberately — render should
  // stay pure, and StrictMode double-invokes render bodies in development,
  // which would double-dispatch a side effect living here.
  if (isPageScrolling !== prevIsPageScrolling) {
    setPrevIsPageScrolling(isPageScrolling);
    if (isPageScrolling) {
      setNeedsFreshTap(true);
    }
  }

  // The actual DOM dispatch, tied to the same transition, but run as a
  // proper effect instead of inline during render.
  useEffect(() => {
    if (isPageScrolling) {
      clearRechartsHoverState(containerRef.current);
    }
  }, [isPageScrolling]);

  // Registering a DOM-event subscription is exactly what useEffect is for;
  // the dismiss callback it registers runs later, asynchronously, in
  // response to a real click — this isn't the "setState synchronously in
  // an effect body" pattern the project's lint rule flags, and unlike a
  // lazy-ref-init approach, this properly de-registers on unmount.
  useEffect(() => {
    ensureClickListener();
    const entry: Registration = {
      container: () => containerRef.current,
      dismiss: () => {
        setNeedsFreshTap(true);
        clearRechartsHoverState(containerRef.current);
      },
    };
    registry.add(entry);
    return () => {
      registry.delete(entry);
    };
  }, []);

  return {
    // Pass to <Tooltip active={suppressed ? false : undefined}>.
    suppressed: isPageScrolling || needsFreshTap,
    // Attach to every panel's chart element (onClick={onChartClick}) —
    // browsers only fire click after a tap, not a drag/scroll, so this is
    // recharts' own tap-vs-drag distinction, not something reimplemented
    // here. Firing anywhere within this chart is enough; it doesn't need
    // to land on a specific data point.
    onChartClick: () => setNeedsFreshTap(false),
    // Attach to one <ResponsiveContainer ref={containerRef}> per chart.
    containerRef,
  };
}

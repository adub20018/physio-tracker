// Truncates its text to however many lines actually fit in the space
// available, ellipsizing the rest — used by the Notes tile on the /log
// overview, whose grid row height is driven by whichever tile is tallest
// (e.g. Physio exercises, when several are logged). A fixed line count
// would either waste the extra room a taller Physio card leaves, or let a
// long note force the whole row taller instead of just itself being
// clipped. Renders at DEFAULT_LINES on first paint (a cap, not a
// reservation — shorter text is unaffected) so an unclamped note can't
// inflate the row in the first place.
//
// Measures the WRAPPING element's height, not this span's own: this span
// must stay auto-height (no forced stretch) so -webkit-line-clamp's own
// height calculation — which is exactly N lines tall, nothing more — is
// the one actually in effect. Stretching the clamped element itself to
// fill the row was the first attempt here, and it doesn't work: the
// clamp only clips at whatever height the box ends up with, so a
// stretched box taller than its N clamped lines leaves a gap where the
// start of line N+1 was still visibly peeking through above the box's
// real bottom edge. The wrapping element (log-overview.module.css's
// .notesSummaryRow) is what actually stretches to match the row; this
// span just reads its height to know how many lines fit.
"use client";

import { useLayoutEffect, useRef, useState } from "react";

const DEFAULT_LINES = 3;

export function ClampedText({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [lines, setLines] = useState(DEFAULT_LINES);

  useLayoutEffect(() => {
    const el = ref.current;
    const container = el?.parentElement;
    if (!el || !container) return;

    function measure() {
      if (!el || !container) return;
      // An explicit unitless line-height (set below) resolves to a
      // definite px value here in every browser, unlike the `normal`
      // keyword default.
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
      if (!lineHeight) return;
      setLines(Math.max(1, Math.floor(container.clientHeight / lineHeight)));
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <span
      ref={ref}
      style={{
        flex: "1 1 auto",
        minWidth: 0,
        lineHeight: 1.35,
        display: "-webkit-box",
        WebkitLineClamp: lines,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}
    >
      {children}
    </span>
  );
}

// Truncates its text to however many lines actually fit in the space its
// own box ends up with, ellipsizing the rest — used by the Notes tile on
// the /log overview, whose grid row height is driven by whichever tile is
// tallest (e.g. Physio exercises, when several are logged). A fixed line
// count would either waste the extra room a taller Physio card leaves, or
// let a long note force the whole row taller instead of just itself being
// clipped. Renders at DEFAULT_LINES on first paint (a cap, not a
// reservation — shorter text is unaffected) so an unclamped note can't
// inflate the row in the first place; log-overview.module.css's
// .tileBodyFill/.tileSummaryFill stretch this element to match the row
// once the grid resolves it, and the effect below re-measures that
// resolved height to pick the real line count, recomputing on resize.
"use client";

import { useLayoutEffect, useRef, useState } from "react";

const DEFAULT_LINES = 3;

export function ClampedText({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [lines, setLines] = useState(DEFAULT_LINES);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    function measure() {
      if (!el) return;
      // An explicit unitless line-height (set below) resolves to a
      // definite px value here in every browser, unlike the `normal`
      // keyword default.
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
      if (!lineHeight) return;
      setLines(Math.max(1, Math.floor(el.clientHeight / lineHeight)));
    }

    measure();
    // el.clientHeight reflects the flex-stretched box (see
    // .tileSummaryFill), not the current clamp's own content height, so
    // this converges instead of measuring its own previous guess.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <span
      ref={ref}
      style={{
        flex: "1 1 auto",
        minHeight: 0,
        alignSelf: "stretch",
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

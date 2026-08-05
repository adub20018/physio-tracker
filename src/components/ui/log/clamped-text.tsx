// Truncates text to however many lines fit (used by /log's Notes tile, whose row height is set
// by the tallest tile). Measures the WRAPPING element, not this span — stretching the span itself breaks -webkit-line-clamp's own height calc, leaking line N+1 above the clamp.
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
      // Explicit unitless line-height (set below) resolves to a definite px value here,
      // unlike the `normal` keyword default.
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

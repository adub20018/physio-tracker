// A hover-tooltip trigger — defaults to a small "?" affordance for metric
// names whose meaning or formula isn't obvious from the label alone (e.g.
// "Physio load" vs "Hold volume"), but the trigger content is swappable:
// pass `children` to attach this same hover behavior to an existing visual
// instead (e.g. a stat tile's own icon badge), rather than gluing a
// separate "?" affordance beside it. Wraps PrimeReact's Tooltip (compound
// Root/Trigger/Popup) with a real vector icon rather than a hand-drawn
// circle + text glyph by default, so it stays a perfect circle and the
// glyph is always centered regardless of viewport width. openDelay is
// shortened from the library's 600ms default so it reads as responding to
// hover, not requiring a deliberate click-and-wait.
//
// Touch devices get a different interaction entirely: PrimeReact's Tooltip
// is hover/focus-only (see its headless useTooltip — the only trigger
// listeners are pointerenter/pointerleave/focus/blur), and touch has no
// real hover. Holding a finger down to trigger it races the browser's own
// long-press text-selection gesture, which is what wins in practice —
// exactly the "I have to hold down and it just highlights the card's
// text" bug this was built to fix. On a coarse pointer (touch-primary —
// `(pointer: coarse)`, not touch *capability*, so a touchscreen laptop
// with a mouse still gets normal hover), the trigger's own tap toggles
// the tooltip via a controlled `open`, instead of relying on hover at
// all. Tapping elsewhere still closes it — for free, via the same
// document-pointerdown dismissal the library already runs internally
// whenever the tooltip is open, controlled or not; nothing extra needed
// here for that half. Desktop leaves `open` uncontrolled so the library's
// own hover/focus handling runs exactly as before.
"use client";

import { useState, useSyncExternalStore } from "react";
import { Tooltip } from "@primereact/ui/tooltip";
import { QuestionCircle } from "@primeicons/react/question-circle";
import styles from "./info-tooltip.module.css";

function subscribeCoarsePointer(callback: () => void) {
  const mq = window.matchMedia("(pointer: coarse)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}
function getCoarsePointerSnapshot() {
  return window.matchMedia("(pointer: coarse)").matches;
}
// Matches the server's render (no real pointer to query) so hydration
// doesn't warn about a mismatch — corrected client-side on mount, same as
// any other browser-only media query.
function getCoarsePointerServerSnapshot() {
  return false;
}

function useIsCoarsePointer(): boolean {
  return useSyncExternalStore(
    subscribeCoarsePointer,
    getCoarsePointerSnapshot,
    getCoarsePointerServerSnapshot,
  );
}

export function InfoTooltip({
  text,
  label,
  children,
  triggerClassName = styles.trigger,
  triggerStyle,
}: {
  text: string;
  label?: string;
  // Trigger content — defaults to the "?" icon.
  children?: React.ReactNode;
  // Class for the trigger button — defaults to the "?" badge's own
  // reset/sizing. Override when wrapping a differently sized/styled
  // trigger that brings its own layout (e.g. a stat tile's icon badge).
  triggerClassName?: string;
  triggerStyle?: React.CSSProperties;
}) {
  const isTouch = useIsCoarsePointer();
  const [open, setOpen] = useState(false);

  return (
    <Tooltip.Root
      openDelay={150}
      closeDelay={100}
      {...(isTouch
        ? { open, onOpenChange: (e: { value?: boolean }) => setOpen(!!e.value) }
        : {})}
    >
      <Tooltip.Trigger
        type="button"
        className={triggerClassName}
        // Baseline touch-safety merged under any caller-supplied style
        // (e.g. StatTile's own badge styling replaces triggerClassName
        // entirely) — always applied, not just for the default "?" badge,
        // since every InfoTooltip usage needs the same long-press fix.
        style={{
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
          touchAction: "manipulation",
          ...triggerStyle,
        }}
        aria-label={label ?? "What does this mean?"}
        onClick={
          isTouch
            ? (e: React.MouseEvent) => {
                e.preventDefault();
                setOpen((prev) => !prev);
              }
            : undefined
        }
      >
        {children ?? <QuestionCircle size={14} className={styles.icon} />}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner side="top" align="center" sideOffset={6}>
          <Tooltip.Popup className={styles.popup}>
            {text}
            <Tooltip.Arrow className={styles.arrow} />
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

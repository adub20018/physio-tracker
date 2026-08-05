// Hover-tooltip with a "?" icon (or custom `children`). Touch holds race the browser's
// long-press text-selection, so touch uses tap-to-toggle via a controlled `open`; desktop stays uncontrolled.
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
// Matches the server's render (no pointer to query) to avoid a hydration mismatch;
// corrected client-side on mount like any other browser-only media query.
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
  // Class for the trigger button — defaults to the "?" badge's own reset/sizing.
  // Override when wrapping a differently sized/styled trigger (e.g. a stat tile's icon badge).
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
        // Baseline touch-safety (long-press fix) merged under any caller-supplied style —
        // applied unconditionally since every InfoTooltip usage needs it, not just the default badge.
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

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
"use client";

import { Tooltip } from "@primereact/ui/tooltip";
import { QuestionCircle } from "@primeicons/react/question-circle";
import styles from "./info-tooltip.module.css";

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
  return (
    <Tooltip.Root openDelay={150} closeDelay={100}>
      <Tooltip.Trigger
        type="button"
        className={triggerClassName}
        style={triggerStyle}
        aria-label={label ?? "What does this mean?"}
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

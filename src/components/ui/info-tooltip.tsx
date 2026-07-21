// A small "?" affordance that reveals an explanation on hover — for metric
// names whose meaning or formula isn't obvious from the label alone (e.g.
// "Physio load" vs "Hold volume"). Wraps PrimeReact's Tooltip (compound
// Root/Trigger/Popup) with a real vector icon rather than a hand-drawn
// circle + text glyph, so it stays a perfect circle and the glyph is always
// centered regardless of viewport width. openDelay is shortened from the
// library's 600ms default so it reads as responding to hover, not requiring
// a deliberate click-and-wait.
"use client";

import { Tooltip } from "@primereact/ui/tooltip";
import { QuestionCircle } from "@primeicons/react/question-circle";
import styles from "./info-tooltip.module.css";

export function InfoTooltip({ text, label }: { text: string; label?: string }) {
  return (
    <Tooltip.Root openDelay={150} closeDelay={100}>
      <Tooltip.Trigger
        type="button"
        className={styles.trigger}
        aria-label={label ?? "What does this mean?"}
      >
        <QuestionCircle size={10} className={styles.icon} />
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

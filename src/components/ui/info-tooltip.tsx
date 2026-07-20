// A small "?" affordance that reveals an explanation on hover/focus — for
// metric names whose meaning or formula isn't obvious from the label alone
// (e.g. "Physio load" vs "Hold volume"). Wraps PrimeReact's Tooltip
// (compound Root/Trigger/Popup, per the docs) rather than a native `title`
// attribute, so it looks and behaves consistently with the rest of the UI
// and works on touch (tap-to-open) as well as hover.
"use client";

import { Tooltip } from "@primereact/ui/tooltip";
import styles from "./info-tooltip.module.css";

export function InfoTooltip({ text, label }: { text: string; label?: string }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        type="button"
        className={styles.trigger}
        aria-label={label ?? "What does this mean?"}
      >
        ?
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

// Toolbar button showing the dashboard's current time range (e.g. "3M") that
// opens the same TimeRangeSelector that used to live inside the settings menu.
"use client";

import { useState } from "react";
import { Popover } from "@primereact/ui/popover";
import { Button } from "@primereact/ui/button";
import { ChevronDown } from "lucide-react";
import { TimeRangeSelector } from "@/components/ui/shared/time-range-selector";
import { TIME_RANGE_LABELS, type TimeRange } from "@/lib/time-range";
import { TOOLBAR_BUTTON_HEIGHT } from "./toolbar-icon-button-props";
import styles from "./dashboard-timerange-button.module.css";

export function DashboardTimerangeButton({
  range,
  onRangeChange,
}: {
  range: TimeRange;
  onRangeChange: (range: TimeRange) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(e: { value?: boolean }) => setOpen(e.value ?? false)}
    >
      <Popover.Trigger
        as={Button}
        variant="outlined"
        severity="secondary"
        size="small"
        className={styles.trigger}
        style={{ height: TOOLBAR_BUTTON_HEIGHT }}
        aria-label={`Change time range, currently ${TIME_RANGE_LABELS[range]}`}
      >
        {TIME_RANGE_LABELS[range]}
        <ChevronDown size={14} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          sideOffset={8}
          align="end"
          className={styles.positioner}
        >
          <Popover.Popup className={styles.popup}>
            <h3 className={styles.title}>Time range</h3>
            <TimeRangeSelector value={range} onChange={onRangeChange} />
            <p className={styles.hint}>
              Applies to every chart on this dashboard. Stat tiles always show
              the last 7 days, and the calendar always shows your full history.
            </p>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

// Time-range picker (7D/1M/3M/1Y/All) — stays state-free; the caller owns
// and persists `range`, so switching is a re-render, not a server round-trip.
"use client";

import { ToggleButton } from "@primereact/ui/togglebutton";
import { ToggleButtonGroup } from "@primereact/ui/togglebuttongroup";
import {
  TIME_RANGES,
  TIME_RANGE_LABELS,
  type TimeRange,
} from "@/lib/time-range";
import styles from "./time-range-selector.module.css";

export function TimeRangeSelector({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}) {
  return (
    <ToggleButtonGroup
      className={styles.group}
      multiple={false}
      allowEmpty={false}
      value={value}
      onValueChange={(e: { value?: unknown }) => onChange(e.value as TimeRange)}
    >
      {TIME_RANGES.map((range) => (
        <ToggleButton.Root key={range} value={range}>
          <ToggleButton.Indicator>
            {TIME_RANGE_LABELS[range]}
          </ToggleButton.Indicator>
        </ToggleButton.Root>
      ))}
    </ToggleButtonGroup>
  );
}

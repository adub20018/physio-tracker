// Per-page time-range picker (7D/1M/3M/1Y/All). Plain controlled component
// — the caller (a client component that also holds the filtered chart data)
// owns the actual `range` state, persists it however it likes (localStorage
// per page, in practice — see dashboard-charts.tsx/insights-charts.tsx), and
// recomputes with it. Keeping this component state-free means switching
// ranges never needs a server round-trip: it's just a re-render over data
// already sitting in memory.
"use client";

import { ToggleButton } from "@primereact/ui/togglebutton";
import { ToggleButtonGroup } from "@primereact/ui/togglebuttongroup";
import { TIME_RANGES, TIME_RANGE_LABELS, type TimeRange } from "@/lib/time-range";
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
          <ToggleButton.Indicator>{TIME_RANGE_LABELS[range]}</ToggleButton.Indicator>
        </ToggleButton.Root>
      ))}
    </ToggleButtonGroup>
  );
}

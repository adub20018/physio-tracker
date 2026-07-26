// Per-page time-range picker (7D/1M/3M/1Y/All) driving both the stat tiles
// and the charts on the dashboard and insights pages. State lives in the
// URL's `range` search param, not component state — the page itself (a
// server component) reads it and recomputes everything server-side, so
// this component's only job is reading/writing that one param.
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ToggleButton } from "@primereact/ui/togglebutton";
import { ToggleButtonGroup } from "@primereact/ui/togglebuttongroup";
import {
  TIME_RANGES,
  TIME_RANGE_LABELS,
  parseTimeRange,
  type TimeRange,
} from "@/lib/time-range";
import styles from "./time-range-selector.module.css";

export function TimeRangeSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = parseTimeRange(searchParams.get("range") ?? undefined);

  function handleChange(value: unknown) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value as TimeRange);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <ToggleButtonGroup
      className={styles.group}
      multiple={false}
      allowEmpty={false}
      value={selected}
      onValueChange={(e: { value?: unknown }) => handleChange(e.value)}
    >
      {TIME_RANGES.map((range) => (
        <ToggleButton.Root key={range} value={range}>
          <ToggleButton.Indicator>{TIME_RANGE_LABELS[range]}</ToggleButton.Indicator>
        </ToggleButton.Root>
      ))}
    </ToggleButtonGroup>
  );
}

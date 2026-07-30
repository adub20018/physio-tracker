// Client island for the insights page's range-dependent charts (the three
// correlation scatter sections — NOT Flare review or the Weekly report
// card, which stay server-rendered and range-independent; "Sleep & pain
// over time" moved to the dashboard). Same pattern as dashboard-charts.tsx:
// receives FULL (unfiltered) computed series from the server component and
// does the cheap final slice to the selected range in-memory, so switching
// ranges never needs a server round-trip.
"use client";

import { useMemo } from "react";
import { Info } from "lucide-react";
import { filterWindow } from "@/domain/aggregate";
import { daysForRange } from "@/lib/time-range";
import { usePersistedTimeRange } from "@/lib/use-persisted-time-range";
import {
  correlationStrength,
  pearson,
  type PairedPoint,
} from "@/domain/correlation";
import { LagScatter } from "@/components/charts/scatter/lag-scatter";
import {
  MultiScatter,
  type ScatterSeries,
} from "@/components/charts/scatter/multi-scatter";
import { SERIES } from "@/components/charts/chart-theme";
import { InfoTooltip } from "@/components/ui/shared/info-tooltip";
import { TimeRangeSelector } from "@/components/ui/shared/time-range-selector";
import styles from "@/components/ui/dashboard/dashboard.module.css";

const RANGE_STORAGE_KEY = "physimate:insights-range";

const PEARSON_R_HINT =
  "Pearson correlation coefficient: how tightly two things move together, from -1 (as one goes up the other reliably goes down) to +1 (both reliably rise together). 0 means no relationship. “Weak/moderate/strong” bucket |r| at 0.2, 0.4, and 0.7. With only a few dozen days, treat this as a hint worth watching, not a proven cause.";

// Header line for one scatter: "r = −0.21 · weak · 41 days". Returns null
// for zero points — the chart's own EmptyState already explains that case
// (with a link to /log), so this line would just repeat it.
function correlationLine(points: PairedPoint[]): string | null {
  if (points.length === 0) return null;
  const r = pearson(points);
  if (r == null) return `not enough paired days yet (${points.length})`;
  const sign = r < 0 ? "−" : "";
  return `r = ${sign}${Math.abs(r).toFixed(2)} · ${correlationStrength(r)} · ${points.length} days`;
}

export function InsightsCharts({
  fullStepsPoints,
  fullVolumePoints,
  fullSleepVsMorning,
  fullSleepVsDaytime,
  fullSleepVsNight,
  today,
  autoScaleYAxis,
}: {
  fullStepsPoints: PairedPoint[];
  fullVolumePoints: PairedPoint[];
  fullSleepVsMorning: PairedPoint[];
  fullSleepVsDaytime: PairedPoint[];
  fullSleepVsNight: PairedPoint[];
  today: string;
  // Account → Preferences: fit each chart's Y-axis to the visible data
  // instead of a fixed range.
  autoScaleYAxis: boolean;
}) {
  const [range, setRange] = usePersistedTimeRange(RANGE_STORAGE_KEY);
  const rangeDays = daysForRange(range);

  const stepsPoints = useMemo(
    () => filterWindow(fullStepsPoints, today, rangeDays),
    [fullStepsPoints, today, rangeDays],
  );
  const volumePoints = useMemo(
    () => filterWindow(fullVolumePoints, today, rangeDays),
    [fullVolumePoints, today, rangeDays],
  );
  const sleepVsMorning = useMemo(
    () => filterWindow(fullSleepVsMorning, today, rangeDays),
    [fullSleepVsMorning, today, rangeDays],
  );
  const sleepVsDaytime = useMemo(
    () => filterWindow(fullSleepVsDaytime, today, rangeDays),
    [fullSleepVsDaytime, today, rangeDays],
  );
  const sleepVsNight = useMemo(
    () => filterWindow(fullSleepVsNight, today, rangeDays),
    [fullSleepVsNight, today, rangeDays],
  );

  const stepsLine = correlationLine(stepsPoints);
  const volumeLine = correlationLine(volumePoints);
  const sleepVsMorningLine = correlationLine(sleepVsMorning);
  const sleepVsDaytimeLine = correlationLine(sleepVsDaytime);
  const sleepVsNightLine = correlationLine(sleepVsNight);

  const sleepScatterSeries: ScatterSeries[] = [
    {
      key: "morning",
      label: "Morning",
      color: SERIES.morning,
      points: sleepVsMorning,
    },
    {
      key: "daytime",
      label: "Daytime",
      color: SERIES.daytime,
      points: sleepVsDaytime,
    },
    { key: "night", label: "Night", color: SERIES.night, points: sleepVsNight },
  ];

  return (
    <>
      <div className={styles.rangeControl}>
        <TimeRangeSelector value={range} onChange={setRange} />
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          Steps vs next-morning pain
          <InfoTooltip text={PEARSON_R_HINT} label="What does r mean?" />
        </h2>
        {stepsLine && <p className={styles.cardSubtitle}>{stepsLine}</p>}
        <LagScatter
          points={stepsPoints}
          xLabel="Steps"
          yLabel="Next-morning pain"
          autoScaleYAxis={autoScaleYAxis}
        />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          Physio load vs next-morning pain
          <InfoTooltip text={PEARSON_R_HINT} label="What does r mean?" />
        </h2>
        {volumeLine && <p className={styles.cardSubtitle}>{volumeLine}</p>}
        <LagScatter
          points={volumePoints}
          xLabel="Physio load"
          yLabel="Next-morning pain"
          autoScaleYAxis={autoScaleYAxis}
        />
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            Sleep vs pain, all day
            <InfoTooltip text={PEARSON_R_HINT} label="What does r mean?" />
          </h2>
          <InfoTooltip
            text="Same day, not lagged — sleep hours logged on a date are the hours slept the night before waking up that day, so they precede all three of that day's readings, not just the morning one."
            label="What does this chart show?"
          >
            <Info size={14} />
          </InfoTooltip>
        </div>
        {(sleepVsMorningLine || sleepVsDaytimeLine || sleepVsNightLine) && (
          <ul className={styles.rList}>
            {sleepVsMorningLine && (
              <li style={{ color: SERIES.morning }}>
                Morning: {sleepVsMorningLine}
              </li>
            )}
            {sleepVsDaytimeLine && (
              <li style={{ color: SERIES.daytime }}>
                Daytime: {sleepVsDaytimeLine}
              </li>
            )}
            {sleepVsNightLine && (
              <li style={{ color: SERIES.night }}>Night: {sleepVsNightLine}</li>
            )}
          </ul>
        )}
        <MultiScatter
          series={sleepScatterSeries}
          xLabel="Sleep (hours)"
          yLabel="Pain"
          autoScaleYAxis={autoScaleYAxis}
        />
      </section>
    </>
  );
}

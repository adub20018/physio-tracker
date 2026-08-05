// Client island for the insights page's range-dependent charts. Receives FULL (unfiltered)
// computed series from the server and slices to the selected range in-memory (no server round-trip).
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
import { PainCandleChart } from "@/components/charts/pain-candle-chart";
import type { PainCandle } from "@/domain/candle";
import { SERIES } from "@/components/charts/chart-theme";
import { InfoTooltip } from "@/components/ui/shared/info-tooltip";
import { TimeRangeSelector } from "@/components/ui/shared/time-range-selector";
import styles from "@/components/ui/dashboard/dashboard.module.css";

const RANGE_STORAGE_KEY = "physimate:insights-range";

// Header line for one scatter: "r = −0.21 · weak · 41 days". Null for zero points
// since the chart's own EmptyState already covers that case.
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
  fullStepsVsPeakPoints,
  fullStepsVsAveragePoints,
  fullVolumeVsPeakPoints,
  fullVolumeVsAveragePoints,
  fullPainCandles,
  fullSleepVsMorning,
  fullSleepVsDaytime,
  fullSleepVsNight,
  today,
  autoScaleYAxis,
}: {
  fullStepsPoints: PairedPoint[];
  fullVolumePoints: PairedPoint[];
  fullStepsVsPeakPoints: PairedPoint[];
  fullStepsVsAveragePoints: PairedPoint[];
  fullVolumeVsPeakPoints: PairedPoint[];
  fullVolumeVsAveragePoints: PairedPoint[];
  fullPainCandles: PainCandle[];
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
  const stepsVsPeakPoints = useMemo(
    () => filterWindow(fullStepsVsPeakPoints, today, rangeDays),
    [fullStepsVsPeakPoints, today, rangeDays],
  );
  const stepsVsAveragePoints = useMemo(
    () => filterWindow(fullStepsVsAveragePoints, today, rangeDays),
    [fullStepsVsAveragePoints, today, rangeDays],
  );
  const volumeVsPeakPoints = useMemo(
    () => filterWindow(fullVolumeVsPeakPoints, today, rangeDays),
    [fullVolumeVsPeakPoints, today, rangeDays],
  );
  const volumeVsAveragePoints = useMemo(
    () => filterWindow(fullVolumeVsAveragePoints, today, rangeDays),
    [fullVolumeVsAveragePoints, today, rangeDays],
  );
  const painCandles = useMemo(
    () => filterWindow(fullPainCandles, today, rangeDays),
    [fullPainCandles, today, rangeDays],
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
  const stepsVsPeakLine = correlationLine(stepsVsPeakPoints);
  const stepsVsAverageLine = correlationLine(stepsVsAveragePoints);
  const volumeVsPeakLine = correlationLine(volumeVsPeakPoints);
  const volumeVsAverageLine = correlationLine(volumeVsAveragePoints);
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
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Steps vs next-morning pain</h2>
          <InfoTooltip
            text="Data is lagged (day-over-day) so the steps are compared to the next morning's pain"
            label="What does this chart show?"
          >
            <Info size={14} />
          </InfoTooltip>
        </div>
        {stepsLine && <p className={styles.cardSubtitle}>{stepsLine}</p>}
        <LagScatter
          points={stepsPoints}
          xLabel="Steps"
          yLabel="Next-morning pain"
          autoScaleYAxis={autoScaleYAxis}
        />
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Steps vs peak next-day pain</h2>
          <InfoTooltip
            text="Steps compared to the highest of the next day's three pain readings (morning, daytime, night) — the worst moment that day reached, not just its morning level"
            label="What does this chart show?"
          >
            <Info size={14} />
          </InfoTooltip>
        </div>
        {stepsVsPeakLine && (
          <p className={styles.cardSubtitle}>{stepsVsPeakLine}</p>
        )}
        <LagScatter
          points={stepsVsPeakPoints}
          xLabel="Steps"
          yLabel="Peak next-day pain"
          autoScaleYAxis={autoScaleYAxis}
        />
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Steps vs average next-day pain</h2>
          <InfoTooltip
            text="Steps compared to the average of the next day's three pain readings — the day's overall level, rather than any one reading"
            label="What does this chart show?"
          >
            <Info size={14} />
          </InfoTooltip>
        </div>
        {stepsVsAverageLine && (
          <p className={styles.cardSubtitle}>{stepsVsAverageLine}</p>
        )}
        <LagScatter
          points={stepsVsAveragePoints}
          xLabel="Steps"
          yLabel="Average next-day pain"
          autoScaleYAxis={autoScaleYAxis}
        />
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Physio load vs next-morning pain</h2>
          <InfoTooltip
            text="Physio Load represents the overall load of a physio exercise. Calculated by (sets * reps * average intensity). Data is lagged (day-over-day) so the physio load are compared to the next morning's pain"
            label="What does this chart show?"
          >
            <Info size={14} />
          </InfoTooltip>
        </div>
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
            Physio load vs peak next-day pain
          </h2>
          <InfoTooltip
            text="Physio load compared to the highest of the next day's three pain readings — the worst moment that day reached, not just its morning level"
            label="What does this chart show?"
          >
            <Info size={14} />
          </InfoTooltip>
        </div>
        {volumeVsPeakLine && (
          <p className={styles.cardSubtitle}>{volumeVsPeakLine}</p>
        )}
        <LagScatter
          points={volumeVsPeakPoints}
          xLabel="Physio load"
          yLabel="Peak next-day pain"
          autoScaleYAxis={autoScaleYAxis}
        />
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            Physio load vs average next-day pain
          </h2>
          <InfoTooltip
            text="Physio load compared to the average of the next day's three pain readings — the day's overall level, rather than any one reading"
            label="What does this chart show?"
          >
            <Info size={14} />
          </InfoTooltip>
        </div>
        {volumeVsAverageLine && (
          <p className={styles.cardSubtitle}>{volumeVsAverageLine}</p>
        )}
        <LagScatter
          points={volumeVsAveragePoints}
          xLabel="Physio load"
          yLabel="Average next-day pain"
          autoScaleYAxis={autoScaleYAxis}
        />
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Morning-to-day pain</h2>
          <InfoTooltip
            text="Each candle is one day's pain movement, in the same terms as a stock candlestick: open = morning pain, high/low = that day's highest and lowest reading, close = night pain. Green means pain came down by night; red means it went up"
            label="What does this chart show?"
          >
            <Info size={14} />
          </InfoTooltip>
        </div>
        <PainCandleChart data={painCandles} autoScaleYAxis={autoScaleYAxis} />
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Sleep vs pain, all day</h2>
          <InfoTooltip
            text="Same day, not lagged — sleep hours logged on a date are the hours slept the night before waking up that day, so they precede all three of that day's readings, not just the morning one"
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

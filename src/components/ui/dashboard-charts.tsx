// Client island for the dashboard's range-dependent charts. Receives the
// FULL (unfiltered) computed series from the server component — rolling
// averages and next-morning-pain lag already baked in, since those need
// full history to compute correctly — and does only the cheap final slice
// to the selected range client-side, via the same pure filterWindow used
// server-side. Range changes are then a plain re-render over data already
// in memory: no server round-trip, no refetch (see the "why is switching
// ranges slow" discussion — it wasn't the data, it was the URL-driven
// navigation forcing a full page re-render for a change the client could
// already answer on its own).
"use client";

import { useMemo } from "react";
import { filterWindow } from "@/domain/aggregate";
import { daysForRange } from "@/lib/time-range";
import { usePersistedTimeRange } from "@/lib/use-persisted-time-range";
import { TimeRangeSelector } from "./time-range-selector";
import {
  PainTimeline,
  type PainTimelinePoint,
} from "@/components/charts/pain-timeline";
import {
  LoadVsSymptoms,
  type LoadVsSymptomsPoint,
} from "@/components/charts/load-vs-symptoms";
import {
  ProgressionChart,
  type ProgressionPoint,
} from "@/components/charts/progression-chart";
import {
  SleepPainTimeline,
  type SleepPainPoint,
} from "@/components/charts/sleep-pain-timeline";
import styles from "./dashboard.module.css";

const RANGE_STORAGE_KEY = "physimate:dashboard-range";

export function DashboardCharts({
  fullTimeline,
  fullLoad,
  fullProgression,
  fullSleepTimelineData,
  today,
  children,
}: {
  fullTimeline: PainTimelinePoint[];
  fullLoad: LoadVsSymptomsPoint[];
  fullProgression: ProgressionPoint[];
  fullSleepTimelineData: SleepPainPoint[];
  today: string;
  // The stat tiles — rendered server-side (they're a fixed 7-day window,
  // independent of the range picked here) but need to sit visually between
  // the picker and the charts. Passed as children rather than duplicated
  // inside this client component, which would need to become async/server
  // just to compute them.
  children: React.ReactNode;
}) {
  const [range, setRange] = usePersistedTimeRange(RANGE_STORAGE_KEY);
  const rangeDays = daysForRange(range);

  const timeline = useMemo(
    () => filterWindow(fullTimeline, today, rangeDays),
    [fullTimeline, today, rangeDays],
  );
  const load = useMemo(
    () => filterWindow(fullLoad, today, rangeDays),
    [fullLoad, today, rangeDays],
  );
  const progression = useMemo(
    () => filterWindow(fullProgression, today, rangeDays),
    [fullProgression, today, rangeDays],
  );
  const sleepTimelineData = useMemo(
    () => filterWindow(fullSleepTimelineData, today, rangeDays),
    [fullSleepTimelineData, today, rangeDays],
  );

  return (
    <>
      <div className={styles.rangeControl}>
        <TimeRangeSelector value={range} onChange={setRange} />
      </div>

      {children}

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Pain over time</h2>
        <p className={styles.cardSubtitle}>
          Raw readings with the 7-day trend — the line that answers &ldquo;am I
          actually progressing?&rdquo;
        </p>
        <PainTimeline data={timeline} />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Load vs next-day pain</h2>
        <p className={styles.cardSubtitle}>
          What you did each day, paired with how the tendon felt across all of
          the next day&apos;s readings — morning, daytime, and night. Load can
          show up at any point the next day, not just the first reading taken.
          Physio load here is the same intensity-weighted metric as the
          dashboard tile, shown per day instead of summed over the week.
        </p>
        <LoadVsSymptoms data={load} />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Sleep &amp; pain over time</h2>
        <p className={styles.cardSubtitle}>
          Sleep the night before, and how the whole next day felt — sleep
          hours logged on a date are the hours slept the night before waking
          up that day, so they precede all three of that day&apos;s readings.
        </p>
        <SleepPainTimeline data={sleepTimelineData} />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Physio progression</h2>
        <p className={styles.cardSubtitle}>
          Intensity range, hold volume, and Physio load across sessions — the
          program advancing is progress too. Hold volume and Physio load can
          move in opposite directions (e.g. longer holds at lower intensity
          raise one and lower the other), so both are shown rather than just
          one.
        </p>
        <ProgressionChart data={progression} />
      </section>
    </>
  );
}

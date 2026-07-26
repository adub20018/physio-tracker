// Sleep & pain over time — an alternative view to the sleep-vs-pain scatter:
// sleep hours as bars, morning/daytime/night pain as three lines, on a
// shared, hover-synchronized x-axis. Deliberately SAME-DAY, not lagged:
// sleep hours logged on a date are the hours slept the night before waking
// up that day, so they already precede that day's readings (unlike
// steps/physio load, whose effect on the tendon shows up the NEXT morning).
"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_CHROME, SERIES, TOOLTIP_STYLE, shortDate } from "./chart-theme";
import styles from "./charts.module.css";

// One day's sleep paired with that SAME day's pain readings.
export type SleepPainPoint = {
  date: string;
  sleepHours: number | null;
  painMorning: number | null;
  painDaytime: number | null;
  painNight: number | null;
};

const SYNC_ID = "sleep-pain-timeline";

export function SleepPainTimeline({ data }: { data: SleepPainPoint[] }) {
  return (
    <div>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span
            className={styles.legendSwatch}
            style={{ background: SERIES.sleep }}
          />
          Sleep (hours)
        </span>
        <span className={styles.legendItem}>
          <span
            className={styles.legendLine}
            style={{ background: SERIES.morning }}
          />
          Morning
        </span>
        <span className={styles.legendItem}>
          <span
            className={styles.legendLine}
            style={{ background: SERIES.daytime }}
          />
          Daytime
        </span>
        <span className={styles.legendItem}>
          <span
            className={styles.legendLine}
            style={{ background: SERIES.night }}
          />
          Night
        </span>
      </div>

      <div className={styles.panelStack}>
        {/* Panel 1: sleep hours */}
        {/* bottom margin > 0 + interval={0}: with a hidden x-axis there's no
            reserved space below the 0 gridline, and Recharts otherwise drops
            the 0 tick's <text> entirely on panels like this one — both
            lessons learned on the Load vs symptoms chart. */}
        <ResponsiveContainer width="100%" height={110}>
          <ComposedChart
            data={data}
            syncId={SYNC_ID}
            margin={{ top: 4, right: 12, bottom: 8, left: -18 }}
          >
            <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
            <XAxis dataKey="date" hide height={4} />
            <YAxis
              domain={[0, "auto"]}
              interval={0}
              tick={CHART_CHROME.tick}
              axisLine={false}
              tickLine={false}
              width={46}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: "var(--muted)" }}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />
            <Bar
              dataKey="sleepHours"
              name="Sleep (hours)"
              fill={SERIES.sleep}
              radius={[3, 3, 0, 0]}
              isAnimationActive={true}
              animationBegin={150}
              animationDuration={300}
              animationEasing="linear"
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div className={styles.panelDivider} />

        {/* Panel 2: morning/daytime/night pain, all three — sleep may not
            just affect the immediate waking reading, so all of the day's
            readings are shown against the same night's sleep. */}
        <ResponsiveContainer width="100%" height={130}>
          <ComposedChart
            data={data}
            syncId={SYNC_ID}
            margin={{ top: 4, right: 12, bottom: 0, left: -18 }}
          >
            <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={CHART_CHROME.tick}
              axisLine={{ stroke: CHART_CHROME.axisLine }}
              tickLine={false}
              minTickGap={28}
            />
            <YAxis
              domain={[0, 10]}
              ticks={[0, 5, 10]}
              tick={CHART_CHROME.tick}
              axisLine={false}
              tickLine={false}
              width={46}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: "var(--muted)" }}
              cursor={{ stroke: CHART_CHROME.axisLine }}
            />
            <Line
              dataKey="painMorning"
              name="Morning"
              stroke={SERIES.morning}
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={true}
              animationBegin={150}
              animationDuration={300}
              animationEasing="linear"
            />
            <Line
              dataKey="painDaytime"
              name="Daytime"
              stroke={SERIES.daytime}
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={true}
              animationBegin={150}
              animationDuration={300}
              animationEasing="linear"
            />
            <Line
              dataKey="painNight"
              name="Night"
              stroke={SERIES.night}
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={true}
              animationBegin={150}
              animationDuration={300}
              animationEasing="linear"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

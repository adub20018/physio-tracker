// Sleep & morning pain over time — an alternative view to the sleep-vs-pain
// scatter: sleep hours as bars, morning pain as a line, on a shared,
// hover-synchronized x-axis. Deliberately SAME-DAY, not lagged: sleep hours
// logged on a date are the hours slept the night before waking up that day,
// so they already precede that day's morning reading (unlike steps/physio
// load, whose effect on the tendon shows up the NEXT morning).
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

// One day's sleep paired with that SAME day's morning pain.
export type SleepPainPoint = {
  date: string;
  sleepHours: number | null;
  painMorning: number | null;
};

const SYNC_ID = "sleep-pain-timeline";

export function SleepPainTimeline({ data }: { data: SleepPainPoint[] }) {
  return (
    <div>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ background: SERIES.night }} />
          Sleep (hours)
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendLine} style={{ background: SERIES.morning }} />
          Morning pain
        </span>
      </div>

      <div className={styles.panelStack}>
        {/* Panel 1: sleep hours */}
        {/* bottom margin > 0 + interval={0}: with a hidden x-axis there's no
            reserved space below the 0 gridline, and Recharts otherwise drops
            the 0 tick's <text> entirely on panels like this one — both
            lessons learned on the Load vs symptoms chart. */}
        <ResponsiveContainer width="100%" height={110}>
          <ComposedChart data={data} syncId={SYNC_ID} margin={{ top: 4, right: 12, bottom: 8, left: -18 }}>
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
              fill={SERIES.night}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div className={styles.panelDivider} />

        {/* Panel 2: morning pain */}
        <ResponsiveContainer width="100%" height={130}>
          <ComposedChart data={data} syncId={SYNC_ID} margin={{ top: 4, right: 12, bottom: 0, left: -18 }}>
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
              name="Morning pain"
              stroke={SERIES.morning}
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

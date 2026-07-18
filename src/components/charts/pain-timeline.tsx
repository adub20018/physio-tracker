// Pain timeline — the dashboard's primary chart. Three thin lines for the
// raw morning/daytime/night readings, one bold emerald line for the 7-day
// rolling average of the daily pain mean, and red dots marking flare days
// (any reading ≥ 3/10). Props are plain data arrays defined by us; Recharts
// is an internal detail of this folder (PLAN.md §5).
"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_CHROME, FLARE_COLOR, SERIES, TOOLTIP_STYLE, shortDate } from "./chart-theme";
import styles from "./charts.module.css";

// One day on the timeline, precomputed by the caller (domain functions).
export type PainTimelinePoint = {
  date: string;
  morning: number | null;
  daytime: number | null;
  night: number | null;
  rollingAvg: number | null;
  // Daily pain average on flare days only (used to place the flare dot).
  flareValue: number | null;
};

const LINES = [
  { key: "morning", label: "Morning", color: SERIES.morning },
  { key: "daytime", label: "Daytime", color: SERIES.daytime },
  { key: "night", label: "Night", color: SERIES.night },
] as const;

export function PainTimeline({ data }: { data: PainTimelinePoint[] }) {
  return (
    <div>
      <div className={styles.legend}>
        {LINES.map((l) => (
          <span key={l.key} className={styles.legendItem}>
            <span className={styles.legendLine} style={{ background: l.color, opacity: 0.7 }} />
            {l.label}
          </span>
        ))}
        <span className={styles.legendItem}>
          <span className={styles.legendLine} style={{ background: SERIES.rollingAvg }} />
          7-day average
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: FLARE_COLOR }} />
          Flare (≥3)
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 6, right: 12, bottom: 0, left: -18 }}>
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
            ticks={[0, 2.5, 5, 7.5, 10]}
            tick={CHART_CHROME.tick}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: "var(--muted)" }}
            cursor={{ stroke: CHART_CHROME.axisLine }}
            formatter={(value: number | string, name: string) =>
              name === "Flare" ? [null, null] : [value, name]
            }
          />
          {/* Raw readings: thin, slightly transparent, gaps preserved */}
          {LINES.map((l) => (
            <Line
              key={l.key}
              dataKey={l.key}
              name={l.label}
              stroke={l.color}
              strokeWidth={1.5}
              strokeOpacity={0.55}
              dot={false}
              isAnimationActive={false}
            />
          ))}
          {/* The trend: bold rolling average */}
          <Line
            dataKey="rollingAvg"
            name="7-day avg"
            stroke={SERIES.rollingAvg}
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
          {/* Flare markers: status red, sized for hover */}
          <Scatter dataKey="flareValue" name="Flare" fill={FLARE_COLOR} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

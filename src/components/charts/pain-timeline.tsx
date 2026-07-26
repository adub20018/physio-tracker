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
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHART_CHROME,
  FLARE_COLOR,
  SERIES,
  TOOLTIP_STYLE,
  shortDate,
} from "./chart-theme";
import styles from "./charts.module.css";

// One day on the timeline, precomputed by the caller (domain functions).
export type PainTimelinePoint = {
  date: string;
  morning: number | null;
  daytime: number | null;
  night: number | null;
  rollingAvg: number | null;
  // The day's worst reading, on flare days only — places the flare dot at
  // the reading that crossed the threshold (always ≥ 3).
  flareValue: number | null;
};

const LINES = [
  { key: "morning", label: "Morning", color: SERIES.morning },
  { key: "daytime", label: "Daytime", color: SERIES.daytime },
  { key: "night", label: "Night", color: SERIES.night },
] as const;

// Custom tooltip content: same look as the shared TOOLTIP_STYLE, but drops
// the "Flare" row. The flare dot's own value always equals whichever
// reading is already shown above it (Morning/Daytime/Night), so listing it
// again is a pure duplicate — the dot itself is the flare signal.
function PainTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: {
    dataKey?: string;
    name?: string;
    value?: number | null;
    color?: string;
  }[];
  label?: string;
}) {
  if (!active || !payload) return null;
  const rows = payload.filter(
    (p) => p.dataKey !== "flareValue" && p.value != null,
  );
  if (rows.length === 0) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ color: "var(--muted)", marginBottom: 4 }}>{label}</div>
      {rows.map((r) => (
        <div key={r.dataKey}>
          <span style={{ color: r.color }}>{r.name}</span>: {r.value}
        </div>
      ))}
    </div>
  );
}

export function PainTimeline({ data }: { data: PainTimelinePoint[] }) {
  return (
    <div>
      <div className={styles.legend}>
        {LINES.map((l) => (
          <span key={l.key} className={styles.legendItem}>
            <span
              className={styles.legendLine}
              style={{ background: l.color, opacity: 0.7 }}
            />
            {l.label}
          </span>
        ))}
        <span className={styles.legendItem}>
          <span
            className={styles.legendLine}
            style={{ background: SERIES.rollingAvg }}
          />
          7-day average
        </span>
        <span className={styles.legendItem}>
          <span
            className={styles.legendDot}
            style={{ background: FLARE_COLOR }}
          />
          Flare (≥3)
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart
          data={data}
          margin={{ top: 6, right: 12, bottom: 0, left: -18 }}
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
            ticks={[0, 2.5, 5, 7.5, 10]}
            tick={CHART_CHROME.tick}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<PainTooltipContent />}
            cursor={{ stroke: CHART_CHROME.axisLine }}
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
              isAnimationActive={true}
              animationBegin={0}
              animationDuration={300}
              animationEasing="linear"
            />
          ))}
          {/* The trend: bold rolling average */}
          <Line
            dataKey="rollingAvg"
            name="7-day avg"
            stroke={SERIES.rollingAvg}
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={true}
            animationBegin={0}
            animationDuration={300}
            animationEasing="linear"
          />
          {/* Flare markers: a dot-only Line on the SHARED chart data — Lines
              skip null points, and sharing the data keeps the crosshair
              tooltip tracking every day. (A Scatter with its own filtered
              data array hijacks the hover index to just the flare points.) */}
          <Line
            dataKey="flareValue"
            name="Flare"
            stroke="none"
            dot={{ r: 4, fill: FLARE_COLOR, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: FLARE_COLOR, strokeWidth: 0 }}
            isAnimationActive={true}
            animationBegin={0}
            animationDuration={300}
            animationEasing="linear"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

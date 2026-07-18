// Progression chart — shows the rehab program itself advancing: the physio
// intensity range (min–max % load) as a band with its midpoint line, plus
// hold volume (sets × seconds) as quiet bars in a separate aligned panel.
// Progress here is progress even when pain plateaus (PLAN.md §3).
"use client";

import {
  Area,
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

// One physio day on the progression chart (rest days are omitted by the
// caller so the band connects session to session).
export type ProgressionPoint = {
  date: string;
  intensityMin: number | null;
  intensityMax: number | null;
  intensityMid: number | null;
  // Total hold volume that day: sets × duration, before intensity weighting.
  holdVolume: number;
};

// Recharts range areas take a [low, high] tuple per point.
type RangePoint = ProgressionPoint & { intensityRange: [number, number] | null };

const SYNC_ID = "progression";

export function ProgressionChart({ data }: { data: ProgressionPoint[] }) {
  const withRange: RangePoint[] = data.map((d) => ({
    ...d,
    intensityRange:
      d.intensityMin != null && d.intensityMax != null
        ? [d.intensityMin, d.intensityMax]
        : null,
  }));

  return (
    <div>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span
            className={styles.legendSwatch}
            style={{ background: SERIES.rollingAvg, opacity: 0.35 }}
          />
          Intensity range (% load)
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendLine} style={{ background: SERIES.rollingAvg }} />
          Midpoint
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ background: SERIES.volume }} />
          Hold volume (sets×sec)
        </span>
      </div>

      {/* Panel 1: intensity band */}
      <ResponsiveContainer width="100%" height={170}>
        <ComposedChart data={withRange} syncId={SYNC_ID} margin={{ top: 6, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
          <XAxis dataKey="date" hide height={4} />
          <YAxis
            domain={[0, 50]}
            ticks={[0, 25, 50]}
            tickFormatter={(v: number) => `${v}%`}
            tick={CHART_CHROME.tick}
            axisLine={false}
            tickLine={false}
            width={46}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: "var(--muted)" }}
            cursor={{ stroke: CHART_CHROME.axisLine }}
            formatter={(value: number | [number, number], name: string) =>
              Array.isArray(value) ? [`${value[0]}–${value[1]}%`, name] : [value, name]
            }
          />
          <Area
            dataKey="intensityRange"
            name="Intensity range"
            stroke="none"
            fill={SERIES.rollingAvg}
            fillOpacity={0.22}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            dataKey="intensityMid"
            name="Midpoint"
            stroke={SERIES.rollingAvg}
            strokeWidth={2}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Panel 2: hold volume */}
      <ResponsiveContainer width="100%" height={110}>
        <ComposedChart data={withRange} syncId={SYNC_ID} margin={{ top: 4, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={CHART_CHROME.tick}
            axisLine={{ stroke: CHART_CHROME.axisLine }}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis tick={CHART_CHROME.tick} axisLine={false} tickLine={false} width={46} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: "var(--muted)" }}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
          />
          <Bar
            dataKey="holdVolume"
            name="Hold volume"
            fill={SERIES.volume}
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

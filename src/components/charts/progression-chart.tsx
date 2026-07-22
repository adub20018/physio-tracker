// Progression chart — shows the rehab program itself advancing: the physio
// intensity range (min–max % load) as a band with its midpoint line, hold
// volume (sets × seconds, unweighted) and Physio load (intensity-weighted)
// as separate aligned panels. Hold volume and Physio load can diverge — e.g.
// longer holds at lower intensity raise hold volume while Physio load
// falls — so both are shown rather than just one, which would otherwise
// misrepresent how the program is actually progressing. Progress here is
// progress even when pain plateaus (PLAN.md §3).
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
import { InfoTooltip } from "@/components/ui/info-tooltip";
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
  // Intensity-weighted load — the same metric as the dashboard tile and
  // Load vs symptoms, shown here so it can be compared against hold volume.
  physioVolume: number;
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
          <InfoTooltip text="The lightest and heaviest load used that day, as a % of bodyweight/resistance — e.g. a session at 20–25% shows as a band from 20 to 25." />
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendLine} style={{ background: SERIES.rollingAvg }} />
          Midpoint
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ background: SERIES.holdVolume }} />
          Hold volume (sets×sec)
          <InfoTooltip text="Raw work performed: sets × hold time (or reps), summed across exercises. Unlike Physio load, this ignores intensity % — a heavier set and a lighter set of the same length count the same." />
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ background: SERIES.volume }} />
          Physio load
          <InfoTooltip text="Sets × hold time × average intensity %. The same metric as the dashboard tile and Load vs symptoms. Weighted by intensity — can move opposite to Hold volume, e.g. longer holds at lower intensity raise Hold volume while Physio load falls." />
        </span>
      </div>

      {/* Three panels get a gap (.panelStack) plus an explicit divider
          element (.panelDivider) between them, so one panel's "0" doesn't
          read as touching the panel below it. */}
      <div className={styles.panelStack}>
        {/* Panel 1: intensity band */}
        {/* bottom margin > 0 + interval={0}: with a hidden x-axis there's no
            reserved space below the 0 gridline, and Recharts otherwise drops
            the 0% tick's <text> entirely on panels like this one. */}
        <ResponsiveContainer width="100%" height={170}>
          <ComposedChart data={withRange} syncId={SYNC_ID} margin={{ top: 6, right: 12, bottom: 8, left: -18 }}>
            <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
            <XAxis dataKey="date" hide height={4} />
            <YAxis
              domain={[0, 50]}
              ticks={[0, 25, 50]}
              interval={0}
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
              formatter={(value, name) =>
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

        <div className={styles.panelDivider} />

        {/* Panel 2: hold volume */}
        <ResponsiveContainer width="100%" height={110}>
          <ComposedChart data={withRange} syncId={SYNC_ID} margin={{ top: 4, right: 12, bottom: 8, left: -18 }}>
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
              dataKey="holdVolume"
              name="Hold volume"
              fill={SERIES.holdVolume}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div className={styles.panelDivider} />

        {/* Panel 3: physio load */}
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
              dataKey="physioVolume"
              name="Physio load"
              fill={SERIES.volume}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

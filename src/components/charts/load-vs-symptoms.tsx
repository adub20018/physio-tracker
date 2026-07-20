// Load vs symptoms — answers "what did I do before it flared?". Three small
// panels stacked on a shared, hover-synchronized x-axis: daily steps, physio
// load (intensity-weighted — see domain/volume.ts), and the NEXT morning's
// pain (load today, symptoms tomorrow — tendon response lags ~24h).
// Deliberately not one dual-axis chart: the measures live on different
// scales, so each gets its own panel and axis.
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

// One day of load paired with the following morning's pain.
export type LoadVsSymptomsPoint = {
  date: string;
  steps: number | null;
  physioVolume: number; // 0 on rest days
  nextMorningPain: number | null;
};

// Shared axis/grid props for the three synchronized panels.
const SYNC_ID = "load-vs-symptoms";

// Compact tick labels ("6k", "1.5k") so step counts never overflow the
// axis gutter and lose their leading digits.
function compactNumber(v: number): string {
  if (Math.abs(v) >= 1000) {
    const k = v / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return String(v);
}

function PanelXAxis({ hidden }: { hidden: boolean }) {
  return (
    <XAxis
      dataKey="date"
      tickFormatter={shortDate}
      tick={CHART_CHROME.tick}
      axisLine={{ stroke: CHART_CHROME.axisLine }}
      tickLine={false}
      minTickGap={28}
      hide={hidden}
      height={hidden ? 4 : 22}
    />
  );
}

export function LoadVsSymptoms({ data }: { data: LoadVsSymptomsPoint[] }) {
  return (
    <div>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ background: SERIES.steps }} />
          Steps
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ background: SERIES.volume }} />
          Physio load
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendLine} style={{ background: SERIES.rollingAvg }} />
          Next-morning pain
        </span>
      </div>

      {/* Panel 1: steps */}
      <ResponsiveContainer width="100%" height={110}>
        <ComposedChart data={data} syncId={SYNC_ID} margin={{ top: 4, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
          <PanelXAxis hidden />
          <YAxis
            domain={[0, "auto"]}
            tickFormatter={compactNumber}
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
          <Bar dataKey="steps" name="Steps" fill={SERIES.steps} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Panel 2: physio volume */}
      <ResponsiveContainer width="100%" height={110}>
        <ComposedChart data={data} syncId={SYNC_ID} margin={{ top: 4, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
          <PanelXAxis hidden />
          <YAxis
            domain={[0, "auto"]}
            tickFormatter={compactNumber}
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

      {/* Panel 3: next-morning pain (the symptom response) */}
      <ResponsiveContainer width="100%" height={130}>
        <ComposedChart data={data} syncId={SYNC_ID} margin={{ top: 4, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
          <PanelXAxis hidden={false} />
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
            dataKey="nextMorningPain"
            name="Next-morning pain"
            stroke={SERIES.rollingAvg}
            strokeWidth={2}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// Load vs symptoms — answers "what did I do before it flared?". Three small
// panels stacked on a shared, hover-synchronized x-axis: daily steps, physio
// load (intensity-weighted — see domain/volume.ts), and the NEXT day's
// morning/daytime/night pain (load today, symptoms tomorrow — tendon
// response lags ~24h, and can show up in any of the next day's readings,
// not just the first one taken). Deliberately not one dual-axis chart: the
// measures live on different scales, so each gets its own panel and axis.
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
import { InfoTooltip } from "@/components/ui/info-tooltip";
import styles from "./charts.module.css";

// One day of load paired with the following day's pain, all three readings.
export type LoadVsSymptomsPoint = {
  date: string;
  steps: number | null;
  physioVolume: number; // 0 on rest days
  nextMorningPain: number | null;
  nextDaytimePain: number | null;
  nextNightPain: number | null;
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
          <span
            className={styles.legendSwatch}
            style={{ background: SERIES.steps }}
          />
          Steps
        </span>
        <span className={styles.legendItem}>
          <span
            className={styles.legendSwatch}
            style={{ background: SERIES.volume }}
          />
          Physio load
          <InfoTooltip text="Sets × hold time × average intensity %, for that day. Weighted by intensity — different from Hold volume in Physio progression, which is raw sets × seconds with no intensity factored in." />
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

      {/* Three panels get a gap (.panelStack) plus an explicit divider
          element (.panelDivider) between them, so a panel's "0" tick
          doesn't read as touching the next panel's top. */}
      <div className={styles.panelStack}>
        {/* Panel 1: steps */}
        {/* bottom margin > 0: with a hidden x-axis there's no reserved space
            below the 0 gridline, so the "0" tick label gets clipped by the
            container edge without it. */}
        <ResponsiveContainer width="100%" height={110}>
          <ComposedChart
            data={data}
            syncId={SYNC_ID}
            margin={{ top: 4, right: 12, bottom: 8, left: -18 }}
          >
            <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
            <PanelXAxis hidden />
            <YAxis
              domain={[0, "auto"]}
              // interval={0}: Recharts otherwise silently drops the domain-min
              // (0) tick on this panel — not a CSS clipping issue, the <text>
              // never renders — forcing every computed tick to draw fixes it.
              interval={0}
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
              dataKey="steps"
              name="Steps"
              fill={SERIES.steps}
              radius={[3, 3, 0, 0]}
              isAnimationActive={true}
              animationBegin={75}
              animationDuration={300}
              animationEasing="linear"
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div className={styles.panelDivider} />

        {/* Panel 2: physio load */}
        <ResponsiveContainer width="100%" height={110}>
          <ComposedChart
            data={data}
            syncId={SYNC_ID}
            margin={{ top: 4, right: 12, bottom: 8, left: -18 }}
          >
            <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
            <PanelXAxis hidden />
            <YAxis
              domain={[0, "auto"]}
              interval={0}
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
              isAnimationActive={true}
              animationBegin={75}
              animationDuration={300}
              animationEasing="linear"
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div className={styles.panelDivider} />

        {/* Panel 3: next-day pain (the symptom response), all three
            readings — load can show up at any point in the next day, not
            just the first reading taken. */}
        <ResponsiveContainer width="100%" height={130}>
          <ComposedChart
            data={data}
            syncId={SYNC_ID}
            margin={{ top: 4, right: 12, bottom: 0, left: -18 }}
          >
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
              name="Morning"
              stroke={SERIES.morning}
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={true}
              animationBegin={75}
              animationDuration={300}
              animationEasing="linear"
            />
            <Line
              dataKey="nextDaytimePain"
              name="Daytime"
              stroke={SERIES.daytime}
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={true}
              animationBegin={75}
              animationDuration={300}
              animationEasing="linear"
            />
            <Line
              dataKey="nextNightPain"
              name="Night"
              stroke={SERIES.night}
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={true}
              animationBegin={75}
              animationDuration={300}
              animationEasing="linear"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

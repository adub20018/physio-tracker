// Load vs symptoms — "what did I do before it flared?" Three panels (steps, physio load, next-day
// pain) share an x-axis since load today maps to tomorrow's symptoms (~24h tendon lag); separate axes since scales differ.
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
import {
  CHART_CHROME,
  CHART_Y_AXIS,
  SERIES,
  TOOLTIP_STYLE,
  shortDate,
} from "./chart-theme";
import { EmptyState } from "@/components/ui/shared/empty-state";
import { useChartTooltipSuppression } from "./use-chart-tooltip-suppression";
import styles from "./charts.module.css";

// One day of load paired with the following day's pain, all three readings.
export type LoadVsSymptomsPoint = {
  date: string;
  steps: number | null;
  physioLoad: number; // 0 on rest days
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
      // Force band scale — on auto this Line-only panel gets "point" scale while Bar panels
      // get "band", diverging near domain edges and drifting the synced hover cursor off the line.
      scale="band"
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

export function LoadVsSymptoms({
  data,
  autoScaleYAxis = false,
  fillHeight = false,
  compact = false,
  hideLegend = false,
}: {
  data: LoadVsSymptomsPoint[];
  // When true, the next-day-pain panel's Y-axis scales to the visible data's own max
  // instead of the fixed 0–10 pain scale (Account → Preferences).
  autoScaleYAxis?: boolean;
  // When true, fill the parent's height instead of the fixed pixel heights used on
  // /insights (see .fill in charts.module.css); panels keep relative proportions via flexGrow.
  fillHeight?: boolean;
  // Add-widget picker preview mode: lets Y-axis ticks drop instead of forcing every one,
  // and skips animation — needed since ~20 previews can mount at once.
  compact?: boolean;
  // Independent of `compact` (set via WidgetRenderContext.hideLegend) so legend visibility
  // can be toggled in preview without touching compact's interval/animation behavior.
  hideLegend?: boolean;
}) {
  const {
    suppressed: tooltipSuppressed,
    onChartClick,
    containerRef,
  } = useChartTooltipSuppression();

  if (data.length === 0) {
    return <EmptyState message="No data yet" height={370} fill={fillHeight} />;
  }

  return (
    <div className={fillHeight ? styles.fill : undefined}>
      {!hideLegend && (
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
              style={{ background: SERIES.load }}
            />
            Physio load
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
      )}

      {/* Explicit divider between panels so a panel's "0" tick doesn't read as touching
          the next panel's top. */}
      <div
        ref={containerRef}
        className={
          fillHeight
            ? `${styles.panelStack} ${styles.fillPanels}`
            : styles.panelStack
        }
      >
        {/* Panel 1: steps */}
        {/* bottom margin > 0: with a hidden x-axis there's no reserved space below the 0
            gridline, so the "0" tick label would get clipped without it. */}
        <ResponsiveContainer
          width="100%"
          height={fillHeight ? "100%" : 110}
          style={fillHeight ? { flex: 110, minHeight: 0 } : undefined}
        >
          <ComposedChart
            data={data}
            syncId={SYNC_ID}
            onClick={onChartClick}
            onTouchStart={onChartClick}
            onMouseDown={onChartClick}
            accessibilityLayer={false}
            margin={{ top: 4, right: 12, bottom: 8, left: -18 }}
          >
            <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
            <PanelXAxis hidden />
            <YAxis
              {...CHART_Y_AXIS}
              domain={[0, "auto"]}
              interval={compact ? "preserveStart" : 0}
              tickFormatter={compactNumber}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: "var(--muted)" }}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              active={tooltipSuppressed ? false : undefined}
            />
            <Bar
              dataKey="steps"
              name="Steps"
              fill={SERIES.steps}
              radius={[3, 3, 0, 0]}
              isAnimationActive={!compact}
              animationBegin={75}
              animationDuration={300}
              animationEasing="linear"
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div className={styles.panelDivider} />

        {/* Panel 2: physio load */}
        <ResponsiveContainer
          width="100%"
          height={fillHeight ? "100%" : 110}
          style={fillHeight ? { flex: 110, minHeight: 0 } : undefined}
        >
          <ComposedChart
            data={data}
            syncId={SYNC_ID}
            onClick={onChartClick}
            onTouchStart={onChartClick}
            onMouseDown={onChartClick}
            accessibilityLayer={false}
            margin={{ top: 4, right: 12, bottom: 8, left: -18 }}
          >
            <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
            <PanelXAxis hidden />
            <YAxis
              {...CHART_Y_AXIS}
              domain={[0, "auto"]}
              interval={compact ? "preserveStart" : 0}
              tickFormatter={compactNumber}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: "var(--muted)" }}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              active={tooltipSuppressed ? false : undefined}
            />
            <Bar
              dataKey="physioLoad"
              name="Physio load"
              fill={SERIES.load}
              radius={[3, 3, 0, 0]}
              isAnimationActive={!compact}
              animationBegin={75}
              animationDuration={300}
              animationEasing="linear"
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div className={styles.panelDivider} />

        {/* Panel 3: next-day pain — load can show up at any point in the next day, not
            just the first reading taken. */}
        <ResponsiveContainer
          width="100%"
          height={fillHeight ? "100%" : 130}
          style={fillHeight ? { flex: 130, minHeight: 0 } : undefined}
        >
          <ComposedChart
            data={data}
            syncId={SYNC_ID}
            onClick={onChartClick}
            onTouchStart={onChartClick}
            onMouseDown={onChartClick}
            accessibilityLayer={false}
            margin={{ top: 4, right: 12, bottom: 0, left: -18 }}
          >
            <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
            <PanelXAxis hidden={false} />
            <YAxis
              {...CHART_Y_AXIS}
              domain={autoScaleYAxis ? [0, "auto"] : [0, 10]}
              ticks={autoScaleYAxis ? undefined : [0, 2.5, 5, 7.5, 10]}
              interval={compact ? "preserveStart" : 0}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: "var(--muted)" }}
              cursor={{ stroke: CHART_CHROME.axisLine }}
              active={tooltipSuppressed ? false : undefined}
            />
            <Line
              dataKey="nextMorningPain"
              name="Morning"
              stroke={SERIES.morning}
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={!compact}
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
              isAnimationActive={!compact}
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
              isAnimationActive={!compact}
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

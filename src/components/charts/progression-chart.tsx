// Progression chart — intensity range (min-max % load) as a band, plus hold volume and physio
// load as separate panels since the two can diverge (e.g. longer holds, lower intensity) (PLAN.md §3).
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
import {
  CHART_CHROME,
  CHART_Y_AXIS,
  SERIES,
  STACKED_PANEL_HEIGHT,
  TOOLTIP_STYLE,
} from "./chart-theme";
import { EmptyState } from "@/components/ui/shared/empty-state";
import { StackedPanelXAxis } from "./stacked-panel-xaxis";
import { useChartTooltipSuppression } from "./use-chart-tooltip-suppression";
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
  physioLoad: number;
};

// Recharts range areas take a [low, high] tuple per point.
type RangePoint = ProgressionPoint & {
  intensityRange: [number, number] | null;
};

const SYNC_ID = "progression";

export function ProgressionChart({
  data,
  autoScaleYAxis = false,
  fillHeight = false,
  compact = false,
  hideLegend = false,
}: {
  data: ProgressionPoint[];
  // When true, the intensity panel's Y-axis scales to the visible data's own max instead
  // of the fixed 0–50% range (Account → Preferences).
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
    return (
      <EmptyState
        message="No physio sessions logged yet"
        height={436}
        fill={fillHeight}
      />
    );
  }

  const withRange: RangePoint[] = data.map((d) => {
    const intensityValue = d.intensityMin ?? d.intensityMax;

    const intensityRange: [number, number] | null =
      d.intensityMin != null && d.intensityMax != null
        ? [d.intensityMin, d.intensityMax]
        : intensityValue != null
          ? [intensityValue, intensityValue]
          : null;

    const intensityMid =
      d.intensityMin != null && d.intensityMax != null
        ? (d.intensityMin + d.intensityMax) / 2
        : intensityValue;

    return {
      ...d,
      intensityRange,
      intensityMid,
    };
  });

  return (
    <div className={fillHeight ? styles.fill : undefined}>
      {!hideLegend && (
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ background: SERIES.intensity, opacity: 0.35 }}
            />
            Intensity range (% load)
          </span>
          <span className={styles.legendItem}>
            <span
              className={styles.legendLine}
              style={{ background: SERIES.intensity }}
            />
            Midpoint
          </span>
          <span className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ background: SERIES.holdVolume }}
            />
            Hold volume (sets×sec)
          </span>
          <span className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ background: SERIES.load }}
            />
            Physio load
          </span>
        </div>
      )}

      {/* Explicit divider between panels so one panel's "0" doesn't read as touching
          the panel below it. */}
      <div
        ref={containerRef}
        className={
          fillHeight
            ? `${styles.panelStack} ${styles.fillPanels}`
            : styles.panelStack
        }
      >
        {/* Panel 1: intensity band */}
        {/* bottom margin > 0 + interval={0}: with a hidden x-axis, Recharts otherwise
            drops the 0% tick's <text> entirely on panels like this one. */}
        <ResponsiveContainer
          width="100%"
          height={fillHeight ? "100%" : STACKED_PANEL_HEIGHT}
          style={fillHeight ? { flex: STACKED_PANEL_HEIGHT, minHeight: 0 } : undefined}
        >
          <ComposedChart
            data={withRange}
            syncId={SYNC_ID}
            onClick={onChartClick}
            onTouchStart={onChartClick}
            onMouseDown={onChartClick}
            accessibilityLayer={false}
            margin={{ top: 4, right: 12, bottom: 4, left: -18 }}
          >
            <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
            {/* scale="band": this Area+Line-only panel would otherwise get "point" scale
                while the Bar panels below get "band", desyncing the hover cursor at the edges. */}
            <XAxis dataKey="date" scale="band" hide height={4} />
            <YAxis
              {...CHART_Y_AXIS}
              domain={autoScaleYAxis ? [0, "auto"] : [0, 50]}
              ticks={autoScaleYAxis ? undefined : [0, 25, 50]}
              interval={compact ? "preserveStart" : 0}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: "var(--muted)" }}
              cursor={{ stroke: CHART_CHROME.axisLine }}
              formatter={(value, name) =>
                Array.isArray(value)
                  ? [`${value[0]}–${value[1]}%`, name]
                  : [value, name]
              }
              active={tooltipSuppressed ? false : undefined}
            />
            <Area
              dataKey="intensityRange"
              name="Intensity range"
              stroke="none"
              fill={SERIES.intensity}
              fillOpacity={0.22}
              connectNulls
              isAnimationActive={!compact}
              animationBegin={150}
              animationDuration={300}
              animationEasing="linear"
            />
            <Line
              dataKey="intensityMid"
              name="Midpoint"
              stroke={SERIES.intensity}
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={!compact}
              animationBegin={150}
              animationDuration={300}
              animationEasing="linear"
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div className={styles.panelDivider} />

        {/* Panel 2: hold volume */}
        <ResponsiveContainer
          width="100%"
          height={fillHeight ? "100%" : STACKED_PANEL_HEIGHT}
          style={fillHeight ? { flex: STACKED_PANEL_HEIGHT, minHeight: 0 } : undefined}
        >
          <ComposedChart
            data={withRange}
            syncId={SYNC_ID}
            onClick={onChartClick}
            onTouchStart={onChartClick}
            onMouseDown={onChartClick}
            accessibilityLayer={false}
            margin={{ top: 4, right: 12, bottom: 4, left: -18 }}
          >
            <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
            {/* scale="band" explicitly, matching Panel 1 (keeps synced panels' scales identical). */}
            <XAxis dataKey="date" scale="band" hide height={4} />
            <YAxis
              {...CHART_Y_AXIS}
              domain={[0, "auto"]}
              interval={compact ? "preserveStart" : 0}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: "var(--muted)" }}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              active={tooltipSuppressed ? false : undefined}
            />
            <Bar
              dataKey="holdVolume"
              name="Hold volume"
              fill={SERIES.holdVolume}
              radius={[3, 3, 0, 0]}
              isAnimationActive={!compact}
              animationBegin={150}
              animationDuration={300}
              animationEasing="linear"
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div className={styles.panelDivider} />

        {/* Panel 3: physio load */}
        <ResponsiveContainer
          width="100%"
          height={fillHeight ? "100%" : STACKED_PANEL_HEIGHT}
          style={fillHeight ? { flex: STACKED_PANEL_HEIGHT, minHeight: 0 } : undefined}
        >
          <ComposedChart
            data={withRange}
            syncId={SYNC_ID}
            onClick={onChartClick}
            onTouchStart={onChartClick}
            onMouseDown={onChartClick}
            accessibilityLayer={false}
            margin={{ top: 4, right: 12, bottom: 4, left: -18 }}
          >
            <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
            {/* scale="band" explicitly, matching Panels 1 & 2; ticks render in
                StackedPanelXAxis below instead of on this panel directly. */}
            <XAxis dataKey="date" scale="band" hide height={4} />
            <YAxis
              {...CHART_Y_AXIS}
              domain={[0, "auto"]}
              interval={compact ? "preserveStart" : 0}
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
              animationBegin={150}
              animationDuration={300}
              animationEasing="linear"
            />
          </ComposedChart>
        </ResponsiveContainer>

        <StackedPanelXAxis data={withRange} />
      </div>
    </div>
  );
}

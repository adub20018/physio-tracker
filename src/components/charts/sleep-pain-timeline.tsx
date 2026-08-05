// Sleep & pain over time — sleep hours as bars, pain as lines, shared x-axis. Same-day (not
// lagged) since sleep precedes that day's readings, unlike steps/physio load's next-day effect.
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

// One day's sleep paired with that SAME day's pain readings.
export type SleepPainPoint = {
  date: string;
  sleepHours: number | null;
  painMorning: number | null;
  painDaytime: number | null;
  painNight: number | null;
};

const SYNC_ID = "sleep-pain-timeline";

export function SleepPainTimeline({
  data,
  autoScaleYAxis = false,
  fillHeight = false,
  compact = false,
  hideLegend = false,
}: {
  data: SleepPainPoint[];
  // When true, the pain panel's Y-axis scales to the visible data's own max instead of
  // the fixed 0–10 pain scale (Account → Preferences).
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
    return <EmptyState message="No data yet" height={250} fill={fillHeight} />;
  }

  return (
    <div className={fillHeight ? styles.fill : undefined}>
      {!hideLegend && (
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
      )}

      <div
        ref={containerRef}
        className={
          fillHeight
            ? `${styles.panelStack} ${styles.fillPanels}`
            : styles.panelStack
        }
      >
        {/* Panel 1: sleep hours */}
        {/* bottom margin > 0 + interval={0}: with a hidden x-axis, Recharts otherwise
            drops the 0 tick's <text> entirely on panels like this one. */}
        <ResponsiveContainer
          width="100%"
          height={fillHeight ? "100%" : 110}
          style={fillHeight ? { flex: 110, minHeight: 0 } : undefined}
        >
          <ComposedChart
            data={data}
            syncId={SYNC_ID}
            onClick={onChartClick}
            accessibilityLayer={false}
            margin={{ top: 4, right: 12, bottom: 8, left: -18 }}
          >
            <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
            {/* scale="band" explicitly, matching Panel 2's Line-only axis (see note there). */}
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
              dataKey="sleepHours"
              name="Sleep (hours)"
              fill={SERIES.sleep}
              radius={[3, 3, 0, 0]}
              isAnimationActive={!compact}
              animationBegin={150}
              animationDuration={300}
              animationEasing="linear"
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div className={styles.panelDivider} />

        {/* Panel 2: all three pain readings — sleep may affect more than just the
            immediate waking reading. */}
        <ResponsiveContainer
          width="100%"
          height={fillHeight ? "100%" : 130}
          style={fillHeight ? { flex: 130, minHeight: 0 } : undefined}
        >
          <ComposedChart
            data={data}
            syncId={SYNC_ID}
            onClick={onChartClick}
            accessibilityLayer={false}
            margin={{ top: 4, right: 12, bottom: 0, left: -18 }}
          >
            <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
            {/* scale="band": this Line-only panel would otherwise get "point" scale while
                Panel 1 (which has a Bar) gets "band", desyncing the hover cursor at the edges. */}
            <XAxis
              dataKey="date"
              scale="band"
              tickFormatter={shortDate}
              tick={CHART_CHROME.tick}
              axisLine={{ stroke: CHART_CHROME.axisLine }}
              tickLine={false}
              minTickGap={28}
            />
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
              dataKey="painMorning"
              name="Morning"
              stroke={SERIES.morning}
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={!compact}
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
              isAnimationActive={!compact}
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
              isAnimationActive={!compact}
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

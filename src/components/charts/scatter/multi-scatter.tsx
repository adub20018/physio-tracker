// Multi-series scatter — several (x, y) series on one axis pair, each with its own color/legend.
// Used where one input affects several outcomes at once (e.g. sleep vs morning/daytime/night pain).
"use client";

import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHART_CHROME,
  CHART_Y_AXIS,
  TOOLTIP_STYLE,
} from "@/components/charts/chart-theme";
import type { PairedPoint } from "@/domain/correlation";
import { EmptyState } from "@/components/ui/shared/empty-state";
import { useChartTooltipSuppression } from "@/components/charts/use-chart-tooltip-suppression";
import styles from "@/components/charts/charts.module.css";

export type ScatterSeries = {
  key: string;
  label: string;
  color: string;
  points: PairedPoint[];
};

export function MultiScatter({
  series,
  xLabel,
  yLabel,
  autoScaleYAxis = false,
  fillHeight = false,
  compact = false,
  hideLegend = false,
}: {
  series: ScatterSeries[];
  xLabel: string;
  yLabel: string;
  // When true, the Y-axis scales to the visible data's own max instead of the fixed
  // 0–10 pain scale (Account → Preferences).
  autoScaleYAxis?: boolean;
  // When true, fill the parent's height instead of the fixed pixel height used on
  // fixed-height mode — see .fill in charts.module.css.
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

  if (series.every((s) => s.points.length === 0)) {
    return <EmptyState message="No data yet" height={280} fill={fillHeight} />;
  }

  return (
    <div className={fillHeight ? styles.fill : undefined}>
      {!hideLegend && (
        <div className={styles.legend}>
          {series.map((s) => (
            <span key={s.key} className={styles.legendItem}>
              <span
                className={styles.legendDot}
                style={{ background: s.color }}
              />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <ResponsiveContainer
        ref={containerRef}
        width="100%"
        height={fillHeight ? "100%" : 260}
        className={fillHeight ? styles.fillChart : undefined}
      >
        <ScatterChart
          margin={{ top: 8, right: 12, bottom: 4, left: 4 }}
          onClick={onChartClick}
          onTouchStart={onChartClick}
          onMouseDown={onChartClick}
          accessibilityLayer={false}
        >
          <CartesianGrid stroke={CHART_CHROME.grid} />
          <XAxis
            dataKey="x"
            name={xLabel}
            type="number"
            tick={CHART_CHROME.tick}
            axisLine={{ stroke: CHART_CHROME.axisLine }}
            tickLine={false}
            label={{
              value: xLabel,
              position: "insideBottom",
              offset: -2,
              fill: "var(--faint)",
              fontSize: 11,
            }}
            height={34}
          />
          <YAxis
            {...CHART_Y_AXIS}
            dataKey="y"
            name={yLabel}
            type="number"
            domain={autoScaleYAxis ? [0, "auto"] : [0, 10]}
            ticks={autoScaleYAxis ? undefined : [0, 2.5, 5, 7.5, 10]}
            interval={compact ? "preserveStart" : 0}
            label={{
              value: yLabel,
              angle: -90,
              position: "insideLeft",
              offset: 4,
              fill: "var(--faint)",
              fontSize: 11,
              style: { textAnchor: "middle" },
            }}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: "var(--muted)" }}
            cursor={{ stroke: CHART_CHROME.axisLine, strokeDasharray: "3 3" }}
            // Show the day the dot belongs to alongside its value.
            formatter={(value, name) => [value, name]}
            labelFormatter={(_, payload) =>
              (payload?.[0]?.payload as PairedPoint | undefined)?.label ?? ""
            }
            active={tooltipSuppressed ? false : undefined}
          />
          {series.map((s) => (
            <Scatter
              key={s.key}
              data={s.points}
              name={s.label}
              fill={s.color}
              fillOpacity={0.75}
              isAnimationActive={!compact}
              animationBegin={150}
              animationDuration={300}
              animationEasing="linear"
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

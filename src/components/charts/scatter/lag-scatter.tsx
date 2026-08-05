// Lag scatter — one dot per day pairing two numeric series. Generic despite the name: used for
// both lagged pairs (steps vs next morning's pain) and same-day pairs; the caller decides what x/y mean.
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
  SERIES,
  TOOLTIP_STYLE,
} from "@/components/charts/chart-theme";
import type { PairedPoint } from "@/domain/correlation";
import { EmptyState } from "@/components/ui/shared/empty-state";
import { useChartTooltipSuppression } from "../use-chart-tooltip-suppression";
import styles from "../charts.module.css";

export function LagScatter({
  points,
  xLabel,
  yLabel,
  autoScaleYAxis = false,
  fillHeight = false,
  compact = false,
}: {
  points: PairedPoint[];
  xLabel: string;
  yLabel: string;
  // When true, the Y-axis scales to fit the visible data's own max instead
  // of the fixed 0–10 pain scale (Account → Preferences).
  autoScaleYAxis?: boolean;
  // When true, fill the parent's height instead of the fixed pixel height
  // used on /insights — see .fill in charts.module.css.
  fillHeight?: boolean;
  // Add-widget picker preview mode: lets the Y-axis drop ticks that don't fit (box is too short to spare the room).
  compact?: boolean;
}) {
  const {
    suppressed: tooltipSuppressed,
    onChartClick,
    containerRef,
  } = useChartTooltipSuppression();

  if (points.length === 0) {
    return <EmptyState message="No data yet" height={240} fill={fillHeight} />;
  }

  return (
    <ResponsiveContainer
      ref={containerRef}
      width="100%"
      height={fillHeight ? "100%" : 240}
      className={fillHeight ? styles.fillChart : undefined}
    >
      <ScatterChart
        margin={{ top: 8, right: 12, bottom: 4, left: 4 }}
        onClick={onChartClick}
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
          // Show the day the dot belongs to alongside both values.
          formatter={(value, name) => [value, name]}
          labelFormatter={(_, payload) =>
            (payload?.[0]?.payload as PairedPoint | undefined)?.label ?? ""
          }
          active={tooltipSuppressed ? false : undefined}
        />
        <Scatter
          data={points}
          fill={SERIES.rollingAvg}
          fillOpacity={0.75}
          isAnimationActive={!compact}
          animationDuration={300}
          animationBegin={0}
          animationEasing="linear"
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

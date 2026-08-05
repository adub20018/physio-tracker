// Tiny inline bar chart behind a dashboard stat tile's headline number. No axes/gridlines
// (glance-level only); hover recolors the bar itself. See StatSparklineArea for the line/area variant.
"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { SparklineTooltipContent } from "./sparkline-tooltip";
import { useChartTooltipSuppression } from "../use-chart-tooltip-suppression";

export function StatSparkline({
  values,
  color,
  animate = true,
}: {
  // Chronological, oldest to newest; null value renders as zero.
  // `display` is pre-formatted server-side since a function can't cross the server/client prop boundary.
  values: { date: string; value: number | null; display: string }[];
  color: string;
  // False in the Add-widget picker's preview thumbnails, to avoid many tiles animating in at once.
  animate?: boolean;
}) {
  const {
    suppressed: tooltipSuppressed,
    onChartClick,
    containerRef,
  } = useChartTooltipSuppression();

  const data = values.map((d, i) => ({
    i,
    date: d.date,
    display: d.display,
    v: d.value ?? 0,
  }));

  return (
    <ResponsiveContainer ref={containerRef} width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        onClick={onChartClick}
        onTouchStart={onChartClick}
        onMouseDown={onChartClick}
        accessibilityLayer={false}
      >
        <Tooltip
          content={<SparklineTooltipContent />}
          cursor={false}
          active={tooltipSuppressed ? false : undefined}
        />
        <Bar
          dataKey="v"
          radius={[4, 4, 1, 1]}
          activeBar={{ fillOpacity: 1 }}
          isAnimationActive={animate}
          animationDuration={200}
          animationBegin={0}
          animationEasing="linear"
        >
          {data.map((d) => (
            <Cell key={d.i} fill={color} fillOpacity={0.5} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

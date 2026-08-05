// Line + gradient-fill variant of the stat-tile sparkline, for continuous trends (avg pain,
// physio load) vs discrete bars. See StatSparkline for the bar variant; shares tooltip/hover model.
"use client";

import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { SparklineTooltipContent } from "./sparkline-tooltip";
import { useChartTooltipSuppression } from "../use-chart-tooltip-suppression";

export function StatSparklineArea({
  values,
  color,
  animate = true,
}: {
  // Chronological, oldest to newest; `value` drives height (null renders as zero). `display`
  // is pre-formatted server-side since a function can't be passed from the server page as a prop.
  values: { date: string; value: number | null; display: string }[];
  color: string;
  // False in the Add-widget picker's preview thumbnails, where many sparklines would
  // otherwise animate in at once right as the dialog opens.
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

  // Unique per instance: two of these can render on the same page, and SVG gradient ids
  // are global to the document — a hardcoded id would make the second reuse the first's gradient.
  const gradientId = `stat-sparkline-area-${useId()}`;

  return (
    <ResponsiveContainer ref={containerRef} width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
        onClick={onChartClick}
        accessibilityLayer={false}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          content={<SparklineTooltipContent />}
          cursor={false}
          active={tooltipSuppressed ? false : undefined}
        />
        <Area
          type="linear"
          dataKey="v"
          stroke={color}
          strokeWidth={1.75}
          strokeOpacity={0.6}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{
            r: 3,
            fill: color,
            stroke: "var(--surface)",
            strokeWidth: 1,
          }}
          isAnimationActive={animate}
          animationDuration={200}
          animationBegin={0}
          animationEasing="linear"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

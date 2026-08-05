// Tiny inline bar chart for a dashboard stat tile — the last N days' raw
// values behind the averaged headline number, so the number reads as "the
// average of THIS shape" rather than a black box. No axes/gridlines: it's a
// glance-level shape, not a chart to interrogate at rest. Every bar sits at
// a faded tint of the tile's own color; hovering one brings just that bar
// to full color (via activeBar) and shows its value/date — no separate grey
// cursor overlay, since the bar recoloring is already the hover feedback.
// See StatSparklineArea for the line/area-fill variant used where a
// continuous trend reads better than discrete daily bars.
"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { SparklineTooltipContent } from "./sparkline-tooltip";
import { useChartTooltipSuppression } from "../use-chart-tooltip-suppression";

export function StatSparkline({
  values,
  color,
  animate = true,
}: {
  // Chronological, oldest to newest. `value` drives the bar's height (null
  // renders as zero); `display` is the already-formatted tooltip text
  // ("2,414 steps", "Not logged", …) — formatted server-side by the
  // caller, same as StatTile's own value/delta props, since a function
  // can't be passed from the server page into this client component as a
  // prop.
  values: { date: string; value: number | null; display: string }[];
  color: string;
  // False in the Add-widget picker's preview thumbnails, where many tiles'
  // sparklines would otherwise animate in at once right as the dialog opens.
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

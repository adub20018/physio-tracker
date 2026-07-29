// Line + gradient-fill variant of the dashboard stat-tile sparkline — used
// where a continuous trend reads better than discrete daily bars (average
// pain, physio load), same idea as the full "Pain over time" chart's own
// rolling-average line. See StatSparkline for the bar variant (steps,
// sleep) and its own rationale; this shares the same tooltip/hover model,
// just a different shape: the area fill under the line is the "look here"
// signal instead of a highlighted bar.
"use client";

import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { SparklineTooltipContent } from "./sparkline-tooltip";

export function StatSparklineArea({
  values,
  color,
}: {
  // Chronological, oldest to newest. `value` drives the line's height
  // (null renders as zero); `display` is the already-formatted tooltip
  // text ("2.9/10 pain", "Not logged", …) — formatted server-side by the
  // caller, same as StatTile's own value/delta props, since a function
  // can't be passed from the server page into this client component as a
  // prop.
  values: { date: string; value: number | null; display: string }[];
  color: string;
}) {
  const data = values.map((d, i) => ({
    i,
    date: d.date,
    display: d.display,
    v: d.value ?? 0,
  }));

  // A stable but unique id per mounted instance: two of these can render on
  // the same page (Pain and Physio Load both use this variant), and SVG
  // gradient ids are global to the document — a hardcoded id would make the
  // second instance silently reuse the first one's gradient definition.
  const gradientId = `stat-sparkline-area-${useId()}`;

  return (
    <ResponsiveContainer width="100%" height={28}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip content={<SparklineTooltipContent />} cursor={false} />
        <Area
          type="linear"
          dataKey="v"
          stroke={color}
          strokeWidth={1.75}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{
            r: 3,
            fill: color,
            stroke: "var(--surface)",
            strokeWidth: 1,
          }}
          isAnimationActive={true}
          animationDuration={200}
          animationBegin={0}
          animationEasing="linear"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Lag scatter — one dot per day pairing two numeric series (x, y). Despite
// the name, it's generic: used for genuinely lagged pairs (steps vs NEXT
// morning's pain) and for same-day pairs (sleep vs THAT day's morning pain)
// alike — the caller decides what x/y mean via the points it passes in. The
// correlation coefficient and sample size are shown beside the title area by
// the caller; this component draws just the plot. Single series → no legend
// (the title names it); hover tooltip per dot.
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
import { CHART_CHROME, SERIES, TOOLTIP_STYLE } from "./chart-theme";
import type { PairedPoint } from "@/domain/correlation";

export function LagScatter({
  points,
  xLabel,
  yLabel,
}: {
  points: PairedPoint[];
  xLabel: string;
  yLabel: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
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
          dataKey="y"
          name={yLabel}
          type="number"
          domain={[0, 10]}
          ticks={[0, 2.5, 5, 7.5, 10]}
          tick={CHART_CHROME.tick}
          axisLine={false}
          tickLine={false}
          width={44}
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
        />
        <Scatter
          data={points}
          fill={SERIES.rollingAvg}
          fillOpacity={0.75}
          isAnimationActive={true}
          animationDuration={300}
          animationBegin={0}
          animationEasing="linear"
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

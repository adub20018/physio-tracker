"use client";

import { ComposedChart, ResponsiveContainer, XAxis } from "recharts";
import { CHART_CHROME, STACKED_PANEL_XAXIS_HEIGHT, shortDate } from "./chart-theme";

// The bottom tick-label row for a stack of synced panels, kept as its own fixed-height
// strip outside the flex-grow pool — every panel above hides its own x-axis and shares
// the same flex weight, so their plot areas stay equal regardless of the chart's total
// height. left:30 replaces the real panels' -18 margin: with no y-axis here to reserve
// CHART_Y_AXIS.width(48), the plain margin has to make up that same 48-18=30 offset itself.
export function StackedPanelXAxis({ data }: { data: { date: string }[] }) {
  return (
    <div
      style={{
        height: STACKED_PANEL_XAXIS_HEIGHT,
        flexShrink: 0,
        // Cancels .panelStack's gap so ticks sit flush against the panel above —
        // its own margin.bottom is the only space left, and that's load-bearing.
        marginTop: "-0.25rem",
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 0, right: 12, bottom: 0, left: 30 }}>
          <XAxis
            dataKey="date"
            scale="band"
            tickFormatter={shortDate}
            tick={CHART_CHROME.tick}
            axisLine={{ stroke: CHART_CHROME.axisLine }}
            tickLine={false}
            minTickGap={28}
            height={STACKED_PANEL_XAXIS_HEIGHT}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

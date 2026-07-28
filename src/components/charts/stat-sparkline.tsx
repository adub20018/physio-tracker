// Tiny inline bar chart for a dashboard stat tile — the last N days' raw
// values behind the averaged headline number, so the number reads as "the
// average of THIS shape" rather than a black box. No axes/gridlines: it's a
// glance-level shape, not a chart to interrogate at rest. Every bar sits at
// a faded tint of the tile's own color; hovering one brings just that bar
// to full color (via activeBar) and shows its value/date — no separate grey
// cursor overlay, since the bar recoloring is already the hover feedback.
"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { TOOLTIP_STYLE } from "./chart-theme";

// "Jul 22" — compact enough for a tooltip over a ~28px-tall sparkline.
function formatTooltipDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function SparklineTooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: { date: string; display: string } }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      <div>{point.display}</div>
      <div style={{ color: "var(--muted)" }}>{formatTooltipDate(point.date)}</div>
    </div>
  );
}

export function StatSparkline({
  values,
  color,
}: {
  // Chronological, oldest to newest. `value` drives the bar's height (null
  // renders as zero); `display` is the already-formatted tooltip text
  // ("2,414 steps", "Not logged", …) — formatted server-side by the
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

  return (
    <ResponsiveContainer width="100%" height={28}>
      <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <Tooltip content={<SparklineTooltipContent />} cursor={false} />
        <Bar
          dataKey="v"
          radius={[4, 4, 1, 1]}
          isAnimationActive={false}
          activeBar={{ fillOpacity: 1 }}
        >
          {data.map((d) => (
            <Cell key={d.i} fill={color} fillOpacity={0.3} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

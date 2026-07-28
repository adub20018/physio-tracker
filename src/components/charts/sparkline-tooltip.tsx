// Shared hover-tooltip content for dashboard stat-tile sparklines — used by
// both the bar (StatSparkline) and line/area (StatSparklineArea) variants,
// so the two chart shapes still read as one consistent hover experience.
"use client";

import { TOOLTIP_STYLE } from "./chart-theme";

// "Jul 22" — compact enough for a tooltip over a ~28px-tall sparkline.
export function formatTooltipDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function SparklineTooltipContent({
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

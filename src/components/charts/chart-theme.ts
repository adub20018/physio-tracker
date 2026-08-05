// Shared visual constants for all charts. Categorical palette validated against dark card
// surface #18181b via the dataviz six-checks validator; color roles stay strict (series vs flare vs pain magnitude).

// Categorical series colors, in fixed order (never cycled).
export const SERIES = {
  // Timeline / pain tracking
  morning: "#38a8d8", // sky
  daytime: "#e34b92", // rose
  night: "#956cf8", // violet

  // Derived health trends
  rollingAvg: "#34d399", // emerald (matches brand)

  // Rehab metrics
  holdVolume: "#d99a58", // amber
  load: "#55b8b1", // aqua teal
  intensity: "#dfc45d", // gold

  // Core stats
  pain: "#fb7185", // coral
  steps: "#38bdf8", // sky blue
  sleep: "#a78bfa", // lavender
} as const;

// Status color for flare markers (means "flare", never "series 4").
export const FLARE_COLOR = "var(--pain-flare)";

// Recessive chart chrome — grid/axis must sit far behind the data.
export const CHART_CHROME = {
  grid: "rgba(255, 255, 255, 0.06)",
  axisLine: "rgba(255, 255, 255, 0.12)",
  tick: { fill: "var(--faint)", fontSize: 11 },
} as const;

// Shared tooltip styling (Recharts contentStyle).
export const TOOLTIP_STYLE: React.CSSProperties = {
  background: "var(--surface-raised)",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--foreground)",
  padding: "0.5rem 0.75rem",
};

// "07-14" style tick label from an ISO date — compact but unambiguous.
export function shortDate(iso: string): string {
  return iso.slice(5);
}

export const CHART_Y_AXIS = {
  width: 48,
  tick: CHART_CHROME.tick,
  axisLine: false,
  tickLine: false,
};

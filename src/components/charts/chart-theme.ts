// Shared visual constants for all chart components. The categorical series
// palette was validated with the dataviz six-checks validator against the
// dark card surface (#18181b): lightness band, chroma floor, adjacent-pair
// CVD separation (worst ΔE 28.4), and ≥3:1 contrast all pass.
//
// Charts keep color roles strict: categorical hues identify series, the
// status red marks flares only, and sequential red encodes pain magnitude
// in the heatmap. Text always wears text colors, never series colors.

// Categorical series colors, in fixed order (never cycled).
export const SERIES = {
  morning: "#0284c7", // sky
  daytime: "#db2777", // pink
  night: "#8b5cf6", // violet
  rollingAvg: "#059669", // emerald — the hero trend line
  steps: "#0284c7", // reuses slot 1 in a chart where it is the only series
  volume: "#8b5cf6", // reuses slot 3 likewise
  // Distinct from morning/daytime/night (sky/pink/violet): sleep appears
  // ALONGSIDE those three in the sleep timeline chart, so it needs its own
  // hue rather than reusing one of theirs the way steps/volume safely do
  // in charts where they're the only series.
  sleep: "#d97706", // amber
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

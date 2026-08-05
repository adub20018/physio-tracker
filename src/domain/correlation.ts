// Correlation between two gappy series, for the insight scatter plots.
// Decision support, not medical analysis: with ~50 points the coefficient is suggestive, never proof (see PLAN.md §3).

// `date` is the anchor day's ISO date, kept separate from the display-only `label` so callers
// can calendar-filter without parsing it back out of the label.
export type PairedPoint = { x: number; y: number; label: string; date: string };

// Pairs two same-length series by index, keeping only positions where both values are present (pairwise deletion).
export function pairSeries(
  xs: (number | null)[],
  ys: (number | null)[],
  labels: string[],
  dates: string[]
): PairedPoint[] {
  if (
    xs.length !== ys.length ||
    xs.length !== labels.length ||
    xs.length !== dates.length
  ) {
    throw new Error("pairSeries inputs must have equal length");
  }
  const pairs: PairedPoint[] = [];
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    const y = ys[i];
    if (x != null && y != null) {
      pairs.push({ x, y, label: labels[i], date: dates[i] });
    }
  }
  return pairs;
}

// Pearson correlation coefficient r ∈ [-1, 1] over complete pairs. Returns null under 3
// pairs or a constant series (r is undefined there — reporting 0 would mislead).
export function pearson(pairs: { x: number; y: number }[]): number | null {
  const n = pairs.length;
  if (n < 3) return null;

  const meanX = pairs.reduce((s, p) => s + p.x, 0) / n;
  const meanY = pairs.reduce((s, p) => s + p.y, 0) / n;
  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (const p of pairs) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    cov += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }
  if (varX === 0 || varY === 0) return null;
  return cov / Math.sqrt(varX * varY);
}

// Human word for the strength of |r|, for display next to the number.
export function correlationStrength(r: number): string {
  const abs = Math.abs(r);
  if (abs >= 0.7) return "strong";
  if (abs >= 0.4) return "moderate";
  if (abs >= 0.2) return "weak";
  return "negligible";
}

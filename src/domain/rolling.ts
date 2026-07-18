// Rolling (trailing) averages over series that may contain gaps.
// Used to turn noisy day-to-day pain readings into a visible trend line.

// Average of the non-null values; null when there are none.
export function average(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v != null);
  if (present.length === 0) return null;
  return present.reduce((a, b) => a + b, 0) / present.length;
}

// Trailing rolling average: result[i] averages the non-null values of
// series[i-window+1 .. i]. Positions whose window holds no values get null.
// The series is assumed ordered (oldest first); gaps stay gaps.
export function rollingAverage(series: (number | null)[], window: number): (number | null)[] {
  if (window < 1) throw new Error(`window must be ≥ 1, got ${window}`);
  return series.map((_, i) => average(series.slice(Math.max(0, i - window + 1), i + 1)));
}

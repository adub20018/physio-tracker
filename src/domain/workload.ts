// Acute:chronic workload ratio — recent load measured against the baseline the body has
// actually adapted to, so "is this a lot?" gets answered relative to you rather than in
// raw units. A spike here is a prompt to look, not a verdict: the ratio comes from
// team-sport research and has never been validated for one person's rehab (PLAN.md §2).
import type { DatedValue } from "./aggregate";

// "Recent" vs "what you're conditioned for". 7:28 is the conventional pairing.
export const ACUTE_WINDOW_DAYS = 7;
export const CHRONIC_WINDOW_DAYS = 28;

// Ratios inside this band mean training near your established baseline.
export const WORKLOAD_STEADY_MIN = 0.8;
export const WORKLOAD_STEADY_MAX = 1.3;

// Guards against a baseline built from almost nothing: without these, one logged day in
// four weeks would define "normal" and the very next session would read as a huge spike.
const MIN_ACUTE_LOGGED_DAYS = 3;
const MIN_CHRONIC_LOGGED_DAYS = 14;

export type WorkloadZone = "steady" | "under" | "over";

export function workloadZone(ratio: number): WorkloadZone {
  if (ratio > WORKLOAD_STEADY_MAX) return "over";
  if (ratio < WORKLOAD_STEADY_MIN) return "under";
  return "steady";
}

// Mean of the logged values in the `window` slots ending at `i`. Unlogged days are
// skipped rather than counted as zero — "didn't record" isn't "did nothing" — so this
// is load per logged day, and null when too few of them to mean anything.
function trailingMean(
  series: DatedValue<number>[],
  i: number,
  window: number,
  minLoggedDays: number,
): number | null {
  const slice = series.slice(Math.max(0, i - window + 1), i + 1);
  const present = slice
    .map((s) => s.value)
    .filter((v): v is number => v != null);
  if (present.length < minLoggedDays) return null;
  return present.reduce((sum, v) => sum + v, 0) / present.length;
}

// Ratio per day, aligned to `series`, which must be calendar-dense (one slot per day,
// null where unlogged) and oldest-first — a window of array slots is only a window of
// days if no dates are missing.
export function workloadRatios(series: DatedValue<number>[]): (number | null)[] {
  return series.map((_, i) => {
    const acute = trailingMean(series, i, ACUTE_WINDOW_DAYS, MIN_ACUTE_LOGGED_DAYS);
    const chronic = trailingMean(
      series,
      i,
      CHRONIC_WINDOW_DAYS,
      MIN_CHRONIC_LOGGED_DAYS,
    );
    // A zero baseline divides to Infinity: four weeks of nothing then one session is
    // "started again", not a ratio worth showing.
    if (acute == null || chronic == null || chronic === 0) return null;
    return acute / chronic;
  });
}

// Most recent ratio in the series, or null if none qualified.
export function latestRatio(ratios: (number | null)[]): number | null {
  for (let i = ratios.length - 1; i >= 0; i--) {
    if (ratios[i] != null) return ratios[i];
  }
  return null;
}

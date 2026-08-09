// Acute:chronic workload ratio — recent load measured against the baseline the body has
// actually adapted to, so "is this a lot?" gets answered relative to you rather than in
// raw units. A spike here is a prompt to look, not a verdict: the ratio comes from
// team-sport research and has never been validated for one person's rehab (PLAN.md §2).
import type { DatedValue } from "./aggregate";

// "Recent" vs "what you're conditioned for". 7:28 is the conventional pairing.
export const ACUTE_WINDOW_DAYS = 7;
export const CHRONIC_WINDOW_DAYS = 28;

// Zone edges. Ratios inside the steady band mean training near your established
// baseline; above it is where flares cluster in the source research.
export const WORKLOAD_STEADY_MIN = 0.8;
export const WORKLOAD_STEADY_MAX = 1.3;
export const WORKLOAD_DANGER_MIN = 1.5;

// Guards against a baseline built from almost nothing: without these, one logged day in
// four weeks would define "normal" and the very next session would read as a huge spike.
const MIN_ACUTE_LOGGED_DAYS = 3;
const MIN_CHRONIC_LOGGED_DAYS = 14;

export type WorkloadZone = "under" | "steady" | "caution" | "danger";

export function workloadZone(ratio: number): WorkloadZone {
  if (ratio > WORKLOAD_DANGER_MIN) return "danger";
  if (ratio > WORKLOAD_STEADY_MAX) return "caution";
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

export type WorkloadSeries = {
  // Acute:chronic ratio — the 7-day mean over the 28-day baseline.
  ratio: (number | null)[];
  // That single day's own load over the same baseline. Shares the ratio's units and
  // axis, so the two can be read together: the spikes a 7-day mean flattens show here.
  dayRatio: (number | null)[];
};

// Both series per day, aligned to `series`, which must be calendar-dense (one slot per
// day, null where unlogged) and oldest-first — a window of array slots is only a window
// of days if no dates are missing.
export function workloadSeries(series: DatedValue<number>[]): WorkloadSeries {
  const ratio: (number | null)[] = [];
  const dayRatio: (number | null)[] = [];

  series.forEach((slot, i) => {
    const acute = trailingMean(series, i, ACUTE_WINDOW_DAYS, MIN_ACUTE_LOGGED_DAYS);
    const chronic = trailingMean(
      series,
      i,
      CHRONIC_WINDOW_DAYS,
      MIN_CHRONIC_LOGGED_DAYS,
    );
    // A zero baseline divides to Infinity: four weeks of nothing then one session is
    // "started again", not a ratio worth showing.
    const usableBaseline = chronic != null && chronic > 0;
    ratio.push(usableBaseline && acute != null ? acute / chronic : null);
    dayRatio.push(usableBaseline && slot.value != null ? slot.value / chronic : null);
  });

  return { ratio, dayRatio };
}

// Most recent ratio in the series, or null if none qualified.
export function latestRatio(ratios: (number | null)[]): number | null {
  for (let i = ratios.length - 1; i >= 0; i--) {
    if (ratios[i] != null) return ratios[i];
  }
  return null;
}

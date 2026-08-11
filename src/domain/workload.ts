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
  // The same two means in the original units (steps, physio load). Multiplying the
  // baseline by the zone edges turns the ratio's thresholds into a corridor you can
  // read directly — see zoneBoundsFor.
  acute: (number | null)[];
  chronic: (number | null)[];
};

// All three series per day, aligned to `series`, which must be calendar-dense (one slot
// per day, null where unlogged) and oldest-first — a window of array slots is only a
// window of days if no dates are missing.
export function acwrWorkloadSeries(
  series: DatedValue<number>[],
): WorkloadSeries {
  const ratio: (number | null)[] = [];
  const acuteOut: (number | null)[] = [];
  const chronicOut: (number | null)[] = [];

  series.forEach((_, i) => {
    const acute = trailingMean(
      series,
      i,
      ACUTE_WINDOW_DAYS,
      MIN_ACUTE_LOGGED_DAYS,
    );
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
    acuteOut.push(acute);
    chronicOut.push(usableBaseline ? chronic : null);
  });

  return { ratio, acute: acuteOut, chronic: chronicOut };
}

// The zone edges expressed in the metric's own units for a given baseline. Bounds the
// 7-day average, not any single day: one hard session is fine as long as the week's
// average stays inside. Null baseline in, null bounds out.
export function zoneBoundsFor(baseline: number | null): {
  steadyMin: number;
  steadyMax: number;
  dangerMin: number;
} | null {
  if (baseline == null) return null;
  return {
    steadyMin: baseline * WORKLOAD_STEADY_MIN,
    steadyMax: baseline * WORKLOAD_STEADY_MAX,
    dangerMin: baseline * WORKLOAD_DANGER_MIN,
  };
}

// Smoothing factor for a given span, the conventional 2/(N+1). At N=28 the most recent
// day carries ~6.9% of the baseline and a day four weeks back ~1%, where a flat 28-day
// mean would still weight both at 1/28.
export function smoothingFactor(spanDays: number): number {
  return 2 / (spanDays + 1);
}

// EWMA variant of the ratio above. Same windows and the same zone thresholds, but the
// means decay exponentially instead of being flat, so recent adaptation counts for more
// than a session four weeks ago and load doesn't drop off a cliff on day 29.
//
// Unlogged days carry the average forward untouched rather than decaying it — "didn't
// record" isn't "did nothing", matching the flat version's skip-nulls rule.
export function ewmaWorkloadSeries(
  series: DatedValue<number>[],
): WorkloadSeries {
  const acuteLambda = smoothingFactor(ACUTE_WINDOW_DAYS);
  const chronicLambda = smoothingFactor(CHRONIC_WINDOW_DAYS);

  const ratio: (number | null)[] = [];
  const acuteOut: (number | null)[] = [];
  const chronicOut: (number | null)[] = [];

  let acute: number | null = null;
  let chronic: number | null = null;
  let loggedDays = 0;

  for (const { value } of series) {
    if (value != null) {
      loggedDays++;
      // The first logged value seeds both averages; there's nothing prior to decay.
      acute =
        acute == null ? value : value * acuteLambda + acute * (1 - acuteLambda);
      chronic =
        chronic == null
          ? value
          : value * chronicLambda + chronic * (1 - chronicLambda);
    }

    // Same warm-up guards as the flat version, counted cumulatively: an EWMA never
    // leaves a window, so "enough history" is a total, not a slice.
    const acuteNow = loggedDays >= MIN_ACUTE_LOGGED_DAYS ? acute : null;
    const chronicNow = loggedDays >= MIN_CHRONIC_LOGGED_DAYS ? chronic : null;
    const usableBaseline = chronicNow != null && chronicNow > 0;

    ratio.push(
      usableBaseline && acuteNow != null ? acuteNow / chronicNow : null,
    );
    acuteOut.push(acuteNow);
    chronicOut.push(usableBaseline ? chronicNow : null);
  }

  return { ratio, acute: acuteOut, chronic: chronicOut };
}

// Most recent ratio in the series, or null if none qualified.
export function latestRatio(ratios: (number | null)[]): number | null {
  for (let i = ratios.length - 1; i >= 0; i--) {
    if (ratios[i] != null) return ratios[i];
  }
  return null;
}

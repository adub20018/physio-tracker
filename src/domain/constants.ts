// Domain constants shared across the app. Kept in domain/ so every layer
// (UI colors, flare detection, charts) agrees on the same thresholds.

// Pain at or above this counts as a flare (PLAN.md §2). Only the fallback/seed value —
// the real threshold is per-user (UserSettings), passed explicitly rather than imported.
export const DEFAULT_FLARE_PAIN_THRESHOLD = 3;

// Charts default to a fixed Y-axis domain; fallback/seed value for the per-user
// "auto-scale Y-axis to fit data" preference (UserSettings).
export const DEFAULT_CHART_AUTO_SCALE_Y_AXIS = false;

// Pain scale bounds and step size used by inputs and displays.
export const PAIN_SCALE_MIN = 0;
export const PAIN_SCALE_MAX = 10;
export const PAIN_SCALE_STEP = 0.5;

// Below this many logged days, the Add-widget picker's previews use a fabricated example
// account instead of the user's own sparse data. Counts logged days, not calendar span.
export const MIN_LOGGED_DAYS_FOR_REAL_PREVIEWS = 14;

// Severity bucket for a single pain reading, for consistent color coding everywhere pain
// is displayed. "elevated" approaches the flare threshold; "flare" is at or above it.
export type PainSeverity = "none" | "mild" | "elevated" | "flare";

export function painSeverity(pain: number, flareThreshold: number): PainSeverity {
  if (pain >= flareThreshold) return "flare";
  if (pain >= 2) return "elevated";
  if (pain > 0) return "mild";
  return "none";
}

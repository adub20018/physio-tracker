// Domain constants shared across the app. Kept in domain/ so every layer
// (UI colors, flare detection, insights) agrees on the same thresholds.

// Physio guidance: pain under 3/10 means exercises can continue. A pain
// reading at or above this value counts as a flare (PLAN.md §2). This is
// only the fallback/seed value — the threshold is a per-user setting
// (Account → Preferences, see repositories/types.ts UserSettings), so
// domain functions take the active threshold as an explicit parameter
// rather than importing this constant directly.
export const DEFAULT_FLARE_PAIN_THRESHOLD = 3;

// Charts default to a fixed Y-axis domain; this is the fallback/seed value
// for the per-user "auto-scale Y-axis to fit data" preference (Account →
// Preferences, see repositories/types.ts UserSettings).
export const DEFAULT_CHART_AUTO_SCALE_Y_AXIS = false;

// Pain scale bounds and step size used by inputs and displays.
export const PAIN_SCALE_MIN = 0;
export const PAIN_SCALE_MAX = 10;
export const PAIN_SCALE_STEP = 0.5;

// Below this many logged days, the Add-widget picker's previews fall back
// to a fabricated example account instead of the signed-in user's own data
// (widget-preview-data.ts) — a fresh or sparse account's real charts would
// mostly just show empty states, which doesn't help judge what a widget
// looks like. Counts logged days, not calendar span (a day only exists in
// DomainDay[] if something was actually logged on it).
export const MIN_LOGGED_DAYS_FOR_REAL_PREVIEWS = 14;

// Severity bucket for a single pain reading, used for consistent color
// coding everywhere pain is displayed. "elevated" is approaching the flare
// threshold; "flare" is at or above it.
export type PainSeverity = "none" | "mild" | "elevated" | "flare";

export function painSeverity(pain: number, flareThreshold: number): PainSeverity {
  if (pain >= flareThreshold) return "flare";
  if (pain >= 2) return "elevated";
  if (pain > 0) return "mild";
  return "none";
}

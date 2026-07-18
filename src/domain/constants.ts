// Domain constants shared across the app. Kept in domain/ so every layer
// (UI colors, flare detection, insights) agrees on the same thresholds.

// Physio guidance: pain under 3/10 means exercises can continue. A pain
// reading at or above this value counts as a flare (PLAN.md §2).
export const FLARE_PAIN_THRESHOLD = 3;

// Pain scale bounds and step size used by inputs and displays.
export const PAIN_SCALE_MIN = 0;
export const PAIN_SCALE_MAX = 10;
export const PAIN_SCALE_STEP = 0.5;

// Severity bucket for a single pain reading, used for consistent color
// coding everywhere pain is displayed. "elevated" is approaching the flare
// threshold; "flare" is at or above it.
export type PainSeverity = "none" | "mild" | "elevated" | "flare";

export function painSeverity(pain: number): PainSeverity {
  if (pain >= FLARE_PAIN_THRESHOLD) return "flare";
  if (pain >= 2) return "elevated";
  if (pain > 0) return "mild";
  return "none";
}

// Flare detection. Per physio guidance, pain under 3/10 means exercises can
// continue — so any reading at or above FLARE_PAIN_THRESHOLD flags the day
// (PLAN.md §2). Threshold lives in constants.ts.
import { FLARE_PAIN_THRESHOLD } from "./constants";
import type { DomainDay } from "./types";

// True when any of the day's pain readings reaches the flare threshold.
export function isFlareDay(
  day: Pick<DomainDay, "painMorning" | "painDaytime" | "painNight">
): boolean {
  return [day.painMorning, day.painDaytime, day.painNight].some(
    (p) => p != null && p >= FLARE_PAIN_THRESHOLD
  );
}

// Whole days between two ISO dates (b - a). Uses UTC arithmetic so the
// result never wobbles across timezones or DST.
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

// One flare day together with the days that preceded it — the "what
// happened before" view for the flare review panel. precedingDays are the
// logged days within `lookback` calendar days before the flare (oldest
// first); unlogged days in that span are simply absent.
export type FlareEpisode = {
  day: DomainDay;
  precedingDays: DomainDay[];
};

// All flare days (newest first) with their lookback context.
export function flareEpisodes(days: DomainDay[], lookback: number): FlareEpisode[] {
  return days
    .filter(isFlareDay)
    .map((day) => ({
      day,
      precedingDays: days.filter((d) => {
        const gap = daysBetween(d.date, day.date);
        return gap >= 1 && gap <= lookback;
      }),
    }))
    .reverse();
}

// Days since the most recent flare, measured from `today`.
// null when no flare has ever been logged. 0 means today flared.
export function daysSinceLastFlare(days: DomainDay[], today: string): number | null {
  let lastFlareDate: string | null = null;
  for (const day of days) {
    if (isFlareDay(day) && (lastFlareDate === null || day.date > lastFlareDate)) {
      lastFlareDate = day.date;
    }
  }
  return lastFlareDate === null ? null : daysBetween(lastFlareDate, today);
}

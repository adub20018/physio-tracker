// Aggregations over logged days: per-day pain average, calendar-window
// filtering, and the week-vs-previous-week comparison behind the dashboard
// stat tiles.
import { average } from "./rolling";
import { dailyPhysioVolume } from "./volume";
import { daysBetween } from "./flare";
import type { DomainDay } from "./types";

// Mean of the day's recorded pain readings; null when none were recorded.
export function dailyPainAverage(
  day: Pick<DomainDay, "painMorning" | "painDaytime" | "painNight">
): number | null {
  return average([day.painMorning, day.painDaytime, day.painNight]);
}

// Days whose date falls in the calendar window [end - (nDays-1), end].
// Calendar-based (not "last N logged rows") so missed days count as missing.
export function filterWindow(days: DomainDay[], end: string, nDays: number): DomainDay[] {
  return days.filter((d) => {
    const diff = daysBetween(d.date, end);
    return diff >= 0 && diff < nDays;
  });
}

// Summary stats for a set of days (typically one calendar week).
export type WindowStats = {
  loggedDays: number;
  painAvg: number | null; // mean of daily pain averages
  stepsAvg: number | null; // mean daily steps (logged days only)
  physioVolume: number; // total volume over the window
  sleepAvg: number | null;
};

export function windowStats(days: DomainDay[]): WindowStats {
  return {
    loggedDays: days.length,
    painAvg: average(days.map(dailyPainAverage)),
    stepsAvg: average(days.map((d) => d.steps)),
    physioVolume: days.reduce((sum, d) => sum + dailyPhysioVolume(d), 0),
    sleepAvg: average(days.map((d) => d.sleepHours)),
  };
}

// The current window vs the one immediately before it (e.g. this week vs
// last week), measured back from `end` inclusive.
export function windowComparison(
  days: DomainDay[],
  end: string,
  nDays: number
): { current: WindowStats; previous: WindowStats } {
  const current = filterWindow(days, end, nDays);
  const previousEndExclusive = filterWindow(days, end, nDays * 2);
  const previous = previousEndExclusive.filter((d) => !current.includes(d));
  return { current: windowStats(current), previous: windowStats(previous) };
}

// Aggregations over logged days: per-day pain average, calendar-window
// filtering, and the week-vs-previous-week comparison behind the dashboard
// stat tiles.
import { average } from "./rolling";
import { dailyPhysioLoad } from "./load";
import { daysBetween } from "./flare";
import { addDays } from "./lag";
import type { DomainDay } from "./types";

// Mean of the day's recorded pain readings; null when none were recorded.
export function dailyPainAverage(
  day: Pick<DomainDay, "painMorning" | "painDaytime" | "painNight">,
): number | null {
  return average([day.painMorning, day.painDaytime, day.painNight]);
}

// Items whose date falls in the calendar window [end - (nDays-1), end].
// Calendar-based (not "last N logged rows") so missed days count as missing.
// Generic over anything with a `date`, not just DomainDay, so the same
// windowing logic filters display-ready chart/point arrays too (dashboard
// and insights time-range selection) without duplicating this check.
export function filterWindow<T extends { date: string }>(
  items: T[],
  end: string,
  nDays: number,
): T[] {
  return items.filter((item) => {
    const diff = daysBetween(item.date, end);
    return diff >= 0 && diff < nDays;
  });
}

// Summary stats for a set of days (typically one calendar week).
export type WindowStats = {
  loggedDays: number;
  painAvg: number | null; // mean of daily pain averages
  stepsAvg: number | null; // mean daily steps (logged days only)
  physioLoad: number; // total volume over the window
  sleepAvg: number | null;
};

export function windowStats(days: DomainDay[]): WindowStats {
  return {
    loggedDays: days.length,
    painAvg: average(days.map(dailyPainAverage)),
    stepsAvg: average(days.map((d) => d.steps)),
    physioLoad: days.reduce((sum, d) => sum + dailyPhysioLoad(d), 0),
    sleepAvg: average(days.map((d) => d.sleepHours)),
  };
}

// The current window vs the one immediately before it (e.g. this week vs
// last week), measured back from `end` inclusive.
export function windowComparison(
  days: DomainDay[],
  end: string,
  nDays: number,
): { current: WindowStats; previous: WindowStats } {
  const current = filterWindow(days, end, nDays);
  const previousEndExclusive = filterWindow(days, end, nDays * 2);
  const previous = previousEndExclusive.filter((d) => !current.includes(d));
  return { current: windowStats(current), previous: windowStats(previous) };
}

// One slot in a lastNDaysSeries result — paired with its calendar date so
// callers (e.g. a sparkline tooltip) can label a value without having to
// re-derive which date it came from.
export type DatedValue<T> = { date: string; value: T | null };

// A fixed-length, calendar-anchored series for the last nDays ending at
// `end` (inclusive), oldest first. Unlike filterWindow (which only returns
// days that HAVE a log entry, so a window with gaps comes back shorter),
// every slot is present — null for days that weren't logged. Built for
// stat-tile sparklines, where a consistent day-by-day cadence matters more
// than compacting past gaps.
export function lastNDaysSeries<T>(
  days: DomainDay[],
  end: string,
  nDays: number,
  pick: (day: DomainDay) => T,
): DatedValue<T>[] {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const series: DatedValue<T>[] = [];
  for (let i = nDays - 1; i >= 0; i--) {
    const date = addDays(end, -i);
    const day = byDate.get(date);
    series.push({ date, value: day ? pick(day) : null });
  }
  return series;
}

// Weekly report card: groups logged days into Monday-started calendar weeks
// and summarizes each — the data behind the Weekly report card widget.
import { windowStats, type WindowStats } from "./aggregate";
import { addDays } from "./lag";
import { isFlareDay } from "./flare";
import type { DomainDay } from "./types";

// One week's row in the report card.
export type WeeklySummary = WindowStats & {
  weekStart: string; // Monday, ISO YYYY-MM-DD
  weekEnd: string; // Sunday, ISO YYYY-MM-DD
  flareDays: number;
};

// Monday of the week containing the given ISO date (UTC arithmetic — no
// timezone wobble).
export function weekStartOf(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // 0 = Mon
  return addDays(iso, -weekday);
}

// Groups days into weeks, oldest first. Weeks with no logged days simply
// don't appear (the table shows what was tracked, not empty rows).
export function weeklyReport(days: DomainDay[], flareThreshold: number): WeeklySummary[] {
  const byWeek = new Map<string, DomainDay[]>();
  for (const day of days) {
    const start = weekStartOf(day.date);
    const list = byWeek.get(start) ?? [];
    list.push(day);
    byWeek.set(start, list);
  }

  return [...byWeek.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([weekStart, weekDays]) => ({
      weekStart,
      weekEnd: addDays(weekStart, 6),
      ...windowStats(weekDays),
      flareDays: weekDays.filter((d) => isFlareDay(d, flareThreshold)).length,
    }));
}

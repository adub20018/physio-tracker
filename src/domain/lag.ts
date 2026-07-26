// Lagged views of the day series. Tendon symptoms typically respond to load
// ~24h later, so charts and correlations pair each day's load with the NEXT
// morning's pain (PLAN.md §3).
import type { DomainDay } from "./types";

// ISO date + n days, using UTC arithmetic so the result never wobbles
// across timezones or DST.
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

// For each day, the morning pain of the following calendar day (null when
// the next day wasn't logged).
export function nextMorningPain(days: DomainDay[]): (number | null)[] {
  const byDate = new Map(days.map((d) => [d.date, d]));
  return days.map((d) => byDate.get(addDays(d.date, 1))?.painMorning ?? null);
}

// Same lag, the following day's daytime/night pain — load can show up in
// any of the next day's readings, not just the first one taken.
export function nextDaytimePain(days: DomainDay[]): (number | null)[] {
  const byDate = new Map(days.map((d) => [d.date, d]));
  return days.map((d) => byDate.get(addDays(d.date, 1))?.painDaytime ?? null);
}

export function nextNightPain(days: DomainDay[]): (number | null)[] {
  const byDate = new Map(days.map((d) => [d.date, d]));
  return days.map((d) => byDate.get(addDays(d.date, 1))?.painNight ?? null);
}

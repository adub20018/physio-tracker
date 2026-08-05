// Display formatters shared across pages (history, insights). Pure
// presentation helpers — no data access, no business rules.
import type { DailyLogWithExercises } from "@/repositories";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Weekday abbreviation for an ISO date, computed without timezone drift.
export function weekdayOf(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}

// "Wed, Jul 22, 2026" — date label shown read-only on each /log section
// page and the review page; the date is only editable from the overview.
export function shortDateLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// "Standing ankle raise 3×20s + 1×30s @25–35%" — one line per exercise name,
// set groups joined, intensity range appended when recorded.
export function summarizeExercises(log: Pick<DailyLogWithExercises, "exercises">): string {
  const byName = new Map<string, typeof log.exercises>();
  for (const ex of log.exercises) {
    const list = byName.get(ex.exerciseName) ?? [];
    list.push(ex);
    byName.set(ex.exerciseName, list);
  }

  const lines: string[] = [];
  for (const [name, entries] of byName) {
    const unitSuffix = (e: (typeof entries)[number]) => (e.unit === "seconds" ? "s" : " reps");
    const sets = entries.map((e) => `${e.sets}×${e.durationOrReps}${unitSuffix(e)}`).join(" + ");
    const { intensityMin: min, intensityMax: max } = entries[0];
    const intensity = min != null ? (min === max ? ` @${min}%` : ` @${min}–${max}%`) : "";
    lines.push(`${name} ${sets}${intensity}`);
  }
  return lines.join("; ");
}

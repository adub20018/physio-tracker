// Compact "what's already here" strings and completion counts for /log overview's tiles and the review page.
// Once anything's logged, every slot shows explicitly ("—" if missing) rather than being silently omitted.
import type { DailyLogWithExercises } from "@/repositories";
import { summarizeExercises } from "./format";

export const NOT_LOGGED = "Not logged yet";

// Drives the tile's progress bar and "2/3" counter. Physio has no fixed slot count,
// so it's treated as a single yes/no slot.
export type SectionProgress = { filled: number; total: number };

export function painProgress(
  log: DailyLogWithExercises | null,
): SectionProgress {
  const filled = log
    ? [log.painMorning, log.painDaytime, log.painNight].filter((v) => v != null)
        .length
    : 0;
  return { filled, total: 3 };
}

export function activityProgress(
  log: DailyLogWithExercises | null,
): SectionProgress {
  const filled = log
    ? [log.steps, log.sleepHours].filter((v) => v != null).length
    : 0;
  return { filled, total: 2 };
}

export function physioProgress(
  log: DailyLogWithExercises | null,
): SectionProgress {
  return { filled: log && log.exercises.length > 0 ? 1 : 0, total: 1 };
}

export function notesProgress(
  log: DailyLogWithExercises | null,
): SectionProgress {
  const filled = log && log.generalNotes != null && log.generalNotes !== "" ? 1 : 0;
  return { filled, total: 1 };
}

// Untruncated, for the review page's "final look-over" — the whole point
// there is reading the actual note back, not a preview of it.
export function notesFullText(log: DailyLogWithExercises | null): string {
  if (!log || !log.generalNotes) return NOT_LOGGED;
  return log.generalNotes;
}

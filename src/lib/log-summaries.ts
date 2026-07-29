// Compact "what's already here" strings and completion counts for the
// /log overview's tiles and the review page — pure presentation, no data
// access. Each summary returns the same "Not logged yet" placeholder when
// its section is completely empty; once anything's there, every slot is
// shown explicitly (with "—" for whatever's still missing) rather than
// silently omitted, so a gap stays visible instead of disappearing into
// the ones that are filled in.
import type { DailyLogWithExercises } from "@/repositories";
import { summarizeExercises } from "./format";

export const NOT_LOGGED = "Not logged yet";

// How many of a section's "slots" are filled in, out of how many it has —
// drives both the tile's segmented progress bar and its "2/3" counter.
// Physio has no fixed slot count (0..n exercises), so it's treated as a
// single yes/no slot: logged something today, or not.
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

export function getPainData(log: DailyLogWithExercises | null) {
  if (!log) return NOT_LOGGED;

  const { painMorning: m, painDaytime: d, painNight: n } = log;

  const painTypes = log.painTypes ?? [];

  if (m == null && d == null && n == null && painTypes.length === 0)
    return NOT_LOGGED;

  return {
    morning: log.painMorning,
    day: log.painDaytime,
    night: log.painNight,
    types: painTypes,
  };
}

export function activityProgress(
  log: DailyLogWithExercises | null,
): SectionProgress {
  const filled = log
    ? [log.steps, log.sleepHours].filter((v) => v != null).length
    : 0;
  return { filled, total: 2 };
}

export function activitySummary(log: DailyLogWithExercises | null): string {
  if (!log) return NOT_LOGGED;
  const { steps, sleepHours } = log;
  const activityTags = log.activityTags ?? [];
  if (steps == null && sleepHours == null && activityTags.length === 0)
    return NOT_LOGGED;

  const parts = [
    steps != null ? `${steps.toLocaleString()} steps` : "Steps —",
    sleepHours != null ? `${sleepHours}h sleep` : "Sleep —",
  ];
  if (activityTags.length > 0) parts.push(activityTags.join(", "));
  return parts.join(" · ");
}

export function physioProgress(
  log: DailyLogWithExercises | null,
): SectionProgress {
  return { filled: log && log.exercises.length > 0 ? 1 : 0, total: 1 };
}

export function physioSummary(log: DailyLogWithExercises | null): string {
  if (!log || log.exercises.length === 0) return NOT_LOGGED;
  return summarizeExercises(log);
}

export function notesProgress(
  log: DailyLogWithExercises | null,
): SectionProgress {
  const filled = log
    ? [log.activityNotes, log.generalNotes].filter((v) => v != null && v !== "")
        .length
    : 0;
  return { filled, total: 2 };
}

// Untruncated, for the review page's "final look-over" — the whole point
// there is reading the actual note back, not a preview of it. Labelled
// (rather than just concatenated) so a missing half is visible as "—"
// instead of the two notes blurring into one string.
export function notesFullText(log: DailyLogWithExercises | null): string {
  if (!log || (!log.activityNotes && !log.generalNotes)) return NOT_LOGGED;
  return `Activity: ${log.activityNotes ?? "—"} · General: ${log.generalNotes ?? "—"}`;
}

// Truncated so a long note can't blow out the overview tile's height.
const NOTE_PREVIEW_LENGTH = 80;

export function notesSummary(log: DailyLogWithExercises | null): string {
  const combined = notesFullText(log);
  if (combined === NOT_LOGGED) return combined;
  return combined.length > NOTE_PREVIEW_LENGTH
    ? `${combined.slice(0, NOTE_PREVIEW_LENGTH - 1)}…`
    : combined;
}

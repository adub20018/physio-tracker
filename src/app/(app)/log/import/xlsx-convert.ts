// Converts one parsed spreadsheet row into the repository's input shape.
// Same spreadsheet format as PLAN.md §1 — column names and quirks (e.g.
// "2/10" pain strings) are handled by the pure domain parsers; this just
// maps a raw sheet row onto DailyLogInput, which the domain layer can't
// depend on directly (domain/ imports nothing — see PLAN.md §5).
import type { DailyLogInput } from "@/repositories";
import {
  deriveActivityTags,
  normalizeExerciseName,
  parseIntensity,
  parsePain,
  parseSetGroups,
  parseSleepHours,
  parseSteps,
  parseText,
  toIsoDate,
} from "@/domain/xlsx-import";

// Shape of one spreadsheet row, keyed by the sheet's header names.
export type SheetRow = {
  Date?: unknown;
  Steps?: unknown;
  "Physio Exercise"?: unknown;
  "Morning Pain Num"?: unknown;
  "Daytime Pain"?: unknown;
  "Night Pain"?: unknown;
  "Sleep Hours (night prior)"?: unknown;
  "Physio Notes"?: unknown;
  Intensity?: unknown;
  "Activity Notes"?: unknown;
  "General Notes"?: unknown;
};

// A row counts as logged if it has any actual data beyond the date —
// the spreadsheet pre-fills empty future rows.
export function hasData(row: SheetRow): boolean {
  return [
    row.Steps,
    row["Morning Pain Num"],
    row["Daytime Pain"],
    row["Night Pain"],
    row["Sleep Hours (night prior)"],
    row["Physio Exercise"],
    row["Activity Notes"],
    row["General Notes"],
  ].some((v) => v != null && String(v).trim() !== "");
}

// Converts one spreadsheet row into the repository's input shape.
// Collects warnings for any cell that had content we could not parse.
export function convertRow(row: SheetRow, warnings: string[]): DailyLogInput | null {
  const date = toIsoDate(row.Date);
  if (!date) {
    warnings.push(`Skipped row with unparseable date: ${JSON.stringify(row.Date)}`);
    return null;
  }

  const warnIfLost = (label: string, raw: unknown, parsed: unknown) => {
    if (raw != null && String(raw).trim() !== "" && parsed == null) {
      warnings.push(`${date}: could not parse ${label}: ${JSON.stringify(raw)}`);
    }
  };

  const painMorning = parsePain(row["Morning Pain Num"]);
  const painDaytime = parsePain(row["Daytime Pain"]);
  const painNight = parsePain(row["Night Pain"]);
  warnIfLost("morning pain", row["Morning Pain Num"], painMorning);
  warnIfLost("daytime pain", row["Daytime Pain"], painDaytime);
  warnIfLost("night pain", row["Night Pain"], painNight);

  const sleepHours = parseSleepHours(row["Sleep Hours (night prior)"]);
  warnIfLost("sleep hours", row["Sleep Hours (night prior)"], sleepHours);

  // One spreadsheet row holds at most one exercise name, but mixed set
  // groups ("3x20, 1x30") become multiple entries with the same name.
  const exerciseName = normalizeExerciseName(row["Physio Exercise"]);
  const setGroups = parseSetGroups(row["Physio Notes"]);
  const intensity = parseIntensity(row.Intensity);
  warnIfLost("exercise sets", row["Physio Notes"], setGroups.length > 0 ? setGroups : null);
  warnIfLost("intensity", row.Intensity, intensity);
  const rawSets = parseText(row["Physio Notes"]);

  const exercises: DailyLogInput["exercises"] = [];
  if (exerciseName && setGroups.length > 0) {
    for (const group of setGroups) {
      exercises.push({
        exerciseName,
        sets: group.sets,
        durationOrReps: group.duration,
        unit: "seconds",
        intensityMin: intensity?.min ?? null,
        intensityMax: intensity?.max ?? null,
        // Preserve the original notation when it was split into groups.
        notes: setGroups.length > 1 ? `Imported from "${rawSets}"` : null,
      });
    }
  } else if (exerciseName) {
    warnings.push(`${date}: exercise "${exerciseName}" has no parseable sets — skipped`);
  }

  return {
    date,
    steps: parseSteps(row.Steps),
    painMorning,
    painDaytime,
    painNight,
    activityTags: deriveActivityTags(row["Activity Notes"]),
    painTypes: null, // not tracked in the spreadsheet; starts with the app
    activityNotes: parseText(row["Activity Notes"]),
    generalNotes: parseText(row["General Notes"]),
    sleepHours,
    exercises,
  };
}

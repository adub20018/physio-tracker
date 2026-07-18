// One-off import of the original tracking spreadsheet into the database.
// Usage: npm run db:import [-- path/to/spreadsheet.xlsx]
//
// Reads every filled row, converts each spreadsheet format to the structured
// schema (see import-helpers.ts), and upserts by date through the repository
// layer — so re-running is safe and never duplicates days. Prints a summary
// plus any cells it could not parse, for manual verification against the
// spreadsheet before the import is considered done (AGENTS.md data-safety rule).
import { readFile } from "node:fs/promises";
import * as XLSX from "xlsx";
import { userRepository, dailyLogRepository, type DailyLogInput } from "../src/repositories";
import {
  deriveActivityTags,
  normalizeExerciseName,
  parseIntensity,
  parsePain,
  parseSetGroups,
  parseSteps,
  parseText,
  toIsoDate,
} from "./import-helpers";

const DEFAULT_PATH = "C:\\Users\\New\\Downloads\\Physio Tracker Formatted.xlsx";

// Shape of one spreadsheet row, keyed by the sheet's header names.
type SheetRow = {
  Date?: unknown;
  Steps?: unknown;
  "Physio Exercise"?: unknown;
  "Morning Pain Num"?: unknown;
  "Daytime Pain"?: unknown;
  "Night Pain"?: unknown;
  "Physio Notes"?: unknown;
  Intensity?: unknown;
  "Activity Notes"?: unknown;
  "General Notes"?: unknown;
};

// A row counts as logged if it has any actual data beyond the date —
// the spreadsheet pre-fills empty future rows through August.
function hasData(row: SheetRow): boolean {
  return [
    row.Steps,
    row["Morning Pain Num"],
    row["Daytime Pain"],
    row["Night Pain"],
    row["Physio Exercise"],
    row["Activity Notes"],
    row["General Notes"],
  ].some((v) => v != null && String(v).trim() !== "");
}

// Converts one spreadsheet row into the repository's input shape.
// Collects warnings for any cell that had content we could not parse.
function convertRow(row: SheetRow, warnings: string[]): DailyLogInput | null {
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
    sleepHours: null, // not tracked in the spreadsheet; starts with the app
    exercises,
  };
}

async function main() {
  const path = process.argv[2] ?? DEFAULT_PATH;
  const workbook = XLSX.read(await readFile(path), { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<SheetRow>(sheet, { defval: null });

  const user = await userRepository.findFirst();
  if (!user) throw new Error("No user in database — run `npm run db:seed` first.");

  const warnings: string[] = [];
  let imported = 0;
  let skippedEmpty = 0;

  for (const row of rows) {
    if (!hasData(row)) {
      skippedEmpty++;
      continue;
    }
    const input = convertRow(row, warnings);
    if (!input) continue;
    await dailyLogRepository.upsert(user.id, input);
    imported++;
  }

  // Summary for verification against the spreadsheet.
  const all = await dailyLogRepository.listAll(user.id);
  const withExercises = all.filter((l) => l.exercises.length > 0).length;
  console.log(`Imported/updated ${imported} days (${skippedEmpty} empty rows skipped).`);
  console.log(`Database now holds ${all.length} daily logs, ${withExercises} with exercises.`);
  console.log(`Date range: ${all[0]?.date} → ${all[all.length - 1]?.date}`);
  if (warnings.length > 0) {
    console.log(`\n${warnings.length} warnings:`);
    for (const w of warnings) console.log(`  - ${w}`);
  } else {
    console.log("No parse warnings.");
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("Import failed:", err);
    process.exit(1);
  }
);

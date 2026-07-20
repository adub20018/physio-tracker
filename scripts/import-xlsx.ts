// One-off/repeatable import of the tracking spreadsheet into the database.
// Usage:
//   npm run db:import                          (default path, prompts before overwriting)
//   npm run db:import -- path/to/sheet.xlsx     (custom path)
//   npm run db:import -- --yes                  (skip the overwrite prompt)
//   npm run db:import -- path/to/sheet.xlsx -y   (both)
//
// Reads every filled row, converts each spreadsheet format to the structured
// schema (see import-helpers.ts), and upserts by date through the repository
// layer — so re-running never creates duplicate days; a spreadsheet row for a
// date that's already in the database REPLACES that day's log and exercises.
//
// Because re-importing overwrites, and any edits made in the app itself for
// that date would be lost, the script always reports how many already-logged
// days the spreadsheet would overwrite and asks for confirmation before
// touching them (AGENTS.md data-safety rule: no bulk overwrite without
// explicit confirmation). New dates import without asking. Pass --yes to
// skip the prompt (e.g. for scripted/non-interactive runs).
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
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

// Separate flags from the positional path argument so `--yes`/`-y` can
// appear in any position without being mistaken for a file path.
const argv = process.argv.slice(2);
const autoConfirm = argv.includes("--yes") || argv.includes("-y");
const positionalPath = argv.find((a) => !a.startsWith("-"));

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

// Asks "continue? [y/N]" on the terminal, listing which dates will be
// overwritten. Returns false (safe default) if the shell isn't interactive
// and --yes wasn't passed, rather than hanging or guessing.
async function confirmOverwrite(dates: string[]): Promise<boolean> {
  if (autoConfirm) return true;
  if (!process.stdin.isTTY) {
    console.log(
      "Non-interactive shell — pass --yes to allow overwriting existing days. Skipping them for now."
    );
    return false;
  }
  const preview = dates.slice(0, 10).join(", ") + (dates.length > 10 ? ` … (+${dates.length - 10} more)` : "");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `\n${dates.length} day(s) already in the database will be OVERWRITTEN with the spreadsheet's values:\n  ${preview}\n\nAny edits made in the app for those days will be replaced. Continue? [y/N] `
  );
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

async function main() {
  const path = positionalPath ?? DEFAULT_PATH;
  const workbook = XLSX.read(await readFile(path), { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<SheetRow>(sheet, { defval: null });

  const user = await userRepository.findFirst();
  if (!user) throw new Error("No user in database — run `npm run db:seed` first.");

  const warnings: string[] = [];
  const parsed: DailyLogInput[] = [];
  let skippedEmpty = 0;

  for (const row of rows) {
    if (!hasData(row)) {
      skippedEmpty++;
      continue;
    }
    const input = convertRow(row, warnings);
    if (input) parsed.push(input);
  }

  // Split into new days (import freely) vs. days that already have a log
  // (overwrite — needs confirmation, since it may discard app-made edits).
  const existingDates = new Set((await dailyLogRepository.listAll(user.id)).map((l) => l.date));
  const newRows = parsed.filter((r) => !existingDates.has(r.date));
  const overwriteRows = parsed.filter((r) => existingDates.has(r.date));

  let toImport = parsed;
  if (overwriteRows.length > 0) {
    const proceed = await confirmOverwrite(overwriteRows.map((r) => r.date));
    if (!proceed) {
      console.log(`Skipping ${overwriteRows.length} existing day(s); importing ${newRows.length} new day(s) only.`);
      toImport = newRows;
    }
  }

  for (const input of toImport) {
    await dailyLogRepository.upsert(user.id, input);
  }

  // Summary for verification against the spreadsheet.
  const all = await dailyLogRepository.listAll(user.id);
  const withExercises = all.filter((l) => l.exercises.length > 0).length;
  console.log(`\nImported/updated ${toImport.length} days (${skippedEmpty} empty rows skipped).`);
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

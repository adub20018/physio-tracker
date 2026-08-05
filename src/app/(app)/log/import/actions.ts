// Spreadsheet import actions: preview classifies rows as new/overwrite without writing;
// confirm writes only what the user approved (AGENTS.md: no bulk overwrite without confirmation).
"use server";

import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/auth/get-current-user";
import { dailyLogRepository } from "@/repositories";
import type { DailyLogInput } from "@/repositories";
import { convertRow, hasData, type SheetRow } from "./xlsx-convert";

export type ImportPreview = {
  parsed: DailyLogInput[];
  newDates: string[];
  overwriteDates: string[];
  warnings: string[];
  skippedEmpty: number;
};

export type PreviewResult = { ok: true; preview: ImportPreview } | { ok: false; error: string };

export async function previewXlsxImport(file: File): Promise<PreviewResult> {
  const user = await getCurrentUser();

  let rows: SheetRow[];
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<SheetRow>(sheet, { defval: null });
  } catch {
    return {
      ok: false,
      error: "Couldn't read that file — make sure it's a .xlsx in the same format as the tracking spreadsheet.",
    };
  }

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

  if (parsed.length === 0) {
    return { ok: false, error: "No rows with data found in that file." };
  }

  const existingDates = new Set((await dailyLogRepository.listAll(user.id)).map((l) => l.date));
  const newDates = parsed.filter((r) => !existingDates.has(r.date)).map((r) => r.date);
  const overwriteDates = parsed.filter((r) => existingDates.has(r.date)).map((r) => r.date);

  return { ok: true, preview: { parsed, newDates, overwriteDates, warnings, skippedEmpty } };
}

export type ConfirmResult = { ok: true; imported: number };

// `parsed` is exactly what previewXlsxImport returned — the client resends
// the parsed rows plus which overwrite dates it opted into, not the file.
export async function confirmXlsxImport(
  parsed: DailyLogInput[],
  includeOverwrites: boolean,
  overwriteDates: string[]
): Promise<ConfirmResult> {
  const user = await getCurrentUser();
  const overwriteSet = new Set(overwriteDates);
  const toImport = includeOverwrites ? parsed : parsed.filter((r) => !overwriteSet.has(r.date));

  for (const input of toImport) {
    await dailyLogRepository.upsert(user.id, input);
  }

  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/log");
  return { ok: true, imported: toImport.length };
}

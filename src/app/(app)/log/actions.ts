// Server actions for the daily log flow. Repository's upsert() always replaces the whole day's
// row, so every action here loads what's already saved and overlays just its own slice.
"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/auth/get-current-user";
import { dailyLogRepository } from "@/repositories";
import type { DailyLogInput } from "@/repositories";
import {
  painSectionSchema,
  activitySectionSchema,
  physioSectionSchema,
  notesSectionSchema,
} from "./schema";

// Result shape returned to every section form.
export type SaveResult = { ok: true; date: string } | { ok: false; errors: string[] };

// Bridges "save just this section" to the repository's full-replace upsert.
async function mergeAndSave(
  userId: string,
  date: string,
  patch: Partial<Omit<DailyLogInput, "date">>
): Promise<void> {
  const existing = await dailyLogRepository.findByDate(userId, date);
  const base: DailyLogInput = {
    date,
    steps: existing?.steps ?? null,
    painMorning: existing?.painMorning ?? null,
    painDaytime: existing?.painDaytime ?? null,
    painNight: existing?.painNight ?? null,
    sleepHours: existing?.sleepHours ?? null,
    activityTags: existing?.activityTags ?? [],
    painTypes: existing?.painTypes ?? [],
    generalNotes: existing?.generalNotes ?? null,
    exercises:
      existing?.exercises.map((ex) => ({
        exerciseName: ex.exerciseName,
        sets: ex.sets,
        durationOrReps: ex.durationOrReps,
        unit: ex.unit,
        intensityMin: ex.intensityMin,
        intensityMax: ex.intensityMax,
        notes: ex.notes,
      })) ?? [],
  };
  await dailyLogRepository.upsert(userId, { ...base, ...patch });

  // Every page that renders log data must reflect the change immediately.
  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/log");
}

export async function savePainSection(payload: unknown): Promise<SaveResult> {
  const parsed = painSectionSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  }
  const user = await getCurrentUser();
  const { date, ...patch } = parsed.data;
  await mergeAndSave(user.id, date, patch);
  return { ok: true, date };
}

export async function saveActivitySection(payload: unknown): Promise<SaveResult> {
  const parsed = activitySectionSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  }
  const user = await getCurrentUser();
  const { date, ...patch } = parsed.data;
  await mergeAndSave(user.id, date, patch);
  return { ok: true, date };
}

export async function savePhysioSection(payload: unknown): Promise<SaveResult> {
  const parsed = physioSectionSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  }
  const user = await getCurrentUser();
  const { date, exercises } = parsed.data;
  await mergeAndSave(user.id, date, { exercises });
  return { ok: true, date };
}

export async function saveNotesSection(payload: unknown): Promise<SaveResult> {
  const parsed = notesSectionSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  }
  const user = await getCurrentUser();
  const { date, ...patch } = parsed.data;
  await mergeAndSave(user.id, date, patch);
  return { ok: true, date };
}

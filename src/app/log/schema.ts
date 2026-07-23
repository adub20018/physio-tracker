// Zod schemas for the daily log flow — one per section, since each section
// now saves independently (Pain, Activity, Physio, Notes each have their own
// page and their own server action). The server never trusts a payload
// (Server Functions are reachable by direct POST), so every action validates
// against one of these before touching the database.
import { z } from "zod";
import { PAIN_SCALE_MAX, PAIN_SCALE_MIN, PAIN_SCALE_STEP } from "@/domain/constants";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

// A pain reading: 0–10 in 0.5 steps, or null when not recorded.
const painValue = z
  .number()
  .min(PAIN_SCALE_MIN)
  .max(PAIN_SCALE_MAX)
  .multipleOf(PAIN_SCALE_STEP)
  .nullable();

// Free-text field: trimmed, empty becomes null so the DB never stores "".
const optionalText = z
  .string()
  .transform((s) => s.trim())
  .transform((s) => (s.length > 0 ? s : null))
  .nullable();

// A pain-type/activity tag: either one of the suggested chips or a custom
// value the user typed — bounded so nobody pastes a paragraph into a chip.
const tag = z.string().trim().min(1).max(40);

export const exerciseSchema = z
  .object({
    exerciseName: z.string().trim().min(1, "Exercise name is required"),
    sets: z.number().int().min(1).max(99),
    durationOrReps: z.number().int().min(1).max(999),
    unit: z.enum(["seconds", "reps"]),
    intensityMin: z.number().min(0).max(100).nullable(),
    intensityMax: z.number().min(0).max(100).nullable(),
    notes: optionalText,
  })
  .refine(
    (ex) =>
      ex.intensityMin == null || ex.intensityMax == null || ex.intensityMin <= ex.intensityMax,
    { message: "Intensity min must be ≤ max", path: ["intensityMin"] }
  );

export const painSectionSchema = z.object({
  date: isoDate,
  painMorning: painValue,
  painDaytime: painValue,
  painNight: painValue,
  painTypes: z.array(tag).max(20),
});
export type PainSectionValues = z.infer<typeof painSectionSchema>;

export const activitySectionSchema = z.object({
  date: isoDate,
  steps: z.number().int().min(0).max(200000).nullable(),
  sleepHours: z.number().min(0).max(24).nullable(),
  activityTags: z.array(tag).max(20),
});
export type ActivitySectionValues = z.infer<typeof activitySectionSchema>;

export const physioSectionSchema = z.object({
  date: isoDate,
  exercises: z.array(exerciseSchema).max(20),
});
export type PhysioSectionValues = z.infer<typeof physioSectionSchema>;

export const notesSectionSchema = z.object({
  date: isoDate,
  activityNotes: optionalText,
  generalNotes: optionalText,
});
export type NotesSectionValues = z.infer<typeof notesSectionSchema>;

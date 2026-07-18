// Zod schema for the daily log form — the single definition of what a valid
// submission looks like. Used by the server action to validate every payload
// (server functions are reachable by direct POST, so the server never trusts
// the client), and its inferred type keeps the client form in sync.
import { z } from "zod";
import { ACTIVITY_TAGS, PAIN_TYPES } from "@/db/schema";
import { PAIN_SCALE_MAX, PAIN_SCALE_MIN, PAIN_SCALE_STEP } from "@/domain/constants";

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

export const dailyLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  steps: z.number().int().min(0).max(200000).nullable(),
  painMorning: painValue,
  painDaytime: painValue,
  painNight: painValue,
  sleepHours: z.number().min(0).max(24).nullable(),
  activityTags: z.array(z.enum(ACTIVITY_TAGS)),
  painTypes: z.array(z.enum(PAIN_TYPES)),
  activityNotes: optionalText,
  generalNotes: optionalText,
  exercises: z.array(exerciseSchema).max(20),
});

// The shape the client form builds and the server action receives.
export type DailyLogFormValues = z.infer<typeof dailyLogSchema>;

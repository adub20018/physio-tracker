// Server action for saving a daily log. The only write path from the /log
// form: validates with zod, resolves the user via the auth seam, writes
// through the repository, then revalidates the pages that display log data.
"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/auth/get-current-user";
import { dailyLogRepository } from "@/repositories";
import { dailyLogSchema } from "./schema";

// Result shape returned to the client form.
export type SaveResult =
  | { ok: true; date: string }
  | { ok: false; errors: string[] };

export async function saveDailyLog(payload: unknown): Promise<SaveResult> {
  // Server functions are callable via direct POST — never trust the payload.
  const parsed = dailyLogSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }

  const user = await getCurrentUser();
  const values = parsed.data;
  await dailyLogRepository.upsert(user.id, {
    date: values.date,
    steps: values.steps,
    painMorning: values.painMorning,
    painDaytime: values.painDaytime,
    painNight: values.painNight,
    sleepHours: values.sleepHours,
    activityTags: values.activityTags,
    painTypes: values.painTypes,
    activityNotes: values.activityNotes,
    generalNotes: values.generalNotes,
    exercises: values.exercises,
  });

  // Every page that renders log data must reflect the change immediately.
  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/log");

  return { ok: true, date: values.date };
}

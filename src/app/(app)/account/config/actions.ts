// Server action for the App config page. Only the flare threshold exists
// today, but this file is the natural place for more configurable settings
// to grow into as they're added (see UserSettings in repositories/types.ts).
"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/auth/get-current-user";
import { userSettingsRepository } from "@/repositories";
import { PAIN_SCALE_MAX, PAIN_SCALE_MIN } from "@/domain/constants";

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function saveFlareThreshold(flareThreshold: number): Promise<SaveResult> {
  if (
    typeof flareThreshold !== "number" ||
    Number.isNaN(flareThreshold) ||
    flareThreshold < PAIN_SCALE_MIN ||
    flareThreshold > PAIN_SCALE_MAX
  ) {
    return {
      ok: false,
      error: `Enter a value between ${PAIN_SCALE_MIN} and ${PAIN_SCALE_MAX}.`,
    };
  }

  const user = await getCurrentUser();
  await userSettingsRepository.upsert(user.id, { flareThreshold });

  // Every page that derives flare detection from the threshold must reflect
  // the change immediately.
  revalidatePath("/");
  revalidatePath("/insights");
  revalidatePath("/history");
  return { ok: true };
}

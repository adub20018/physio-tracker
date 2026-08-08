// Server action for the "Delete data" button. Account deletion itself
// happens client-side via Better Auth; this only covers wiping app data.
"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/auth/get-current-user";
import { dailyLogRepository, userSettingsRepository } from "@/repositories";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function deleteAllData(): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    await dailyLogRepository.deleteAll(user.id);
    await userSettingsRepository.delete(user.id);

    revalidatePath("/dashboard");
    revalidatePath("/history");
    revalidatePath("/log");
    revalidatePath("/account/preferences");
    return { ok: true };
  } catch (err) {
    console.error("Delete all data failed: ", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

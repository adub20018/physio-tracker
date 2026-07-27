// Server action for the Data page's "Delete data" button. Deleting the
// account itself (Better Auth's deleteUser) happens client-side, same as
// the Profile page's name change — this action only covers the "keep my
// account, wipe my data" case, which needs no auth involvement at all.
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
    revalidatePath("/insights");
    revalidatePath("/history");
    revalidatePath("/log");
    revalidatePath("/account/preferences");
    return { ok: true };
  } catch (err) {
    console.error("Delete all data failed: ", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

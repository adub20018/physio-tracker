// Server actions for one dashboard's edit mode.
"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/auth/get-current-user";
import { dashboardRepository } from "@/repositories";
import type { NewDashboardWidgetInput } from "@/repositories";
import { saveDashboardLayoutSchema } from "./schema";

export type SaveLayoutResult = { ok: true } | { ok: false; error: string };

// Replaces a dashboard's entire widget set — the Save button in edit mode.
// dashboardRepository.saveWidgets already scopes by userId and no-ops if
// the dashboard isn't the caller's, so there's no separate ownership check
// needed here.
export async function saveDashboardLayout(
  dashboardId: string,
  widgets: NewDashboardWidgetInput[],
): Promise<SaveLayoutResult> {
  const parsed = saveDashboardLayoutSchema.safeParse(widgets);
  if (!parsed.success) {
    return { ok: false, error: "That layout couldn't be saved — try again." };
  }

  const user = await getCurrentUser();
  await dashboardRepository.saveWidgets(dashboardId, user.id, parsed.data);
  revalidatePath(`/dashboard/${dashboardId}`);
  return { ok: true };
}

// Restores the default starting layout, discarding the user's arrangement —
// the "Reset to default dashboard" action in the dashboard config.
export async function resetDashboardToDefault(
  dashboardId: string,
): Promise<SaveLayoutResult> {
  const user = await getCurrentUser();
  await dashboardRepository.resetToDefault(dashboardId, user.id);
  revalidatePath(`/dashboard/${dashboardId}`);
  return { ok: true };
}

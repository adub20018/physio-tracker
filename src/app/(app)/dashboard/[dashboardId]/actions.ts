// Server actions for a dashboard: its edit-mode layout, and creating,
// renaming, or deleting the dashboard itself.
"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/auth/get-current-user";
import { dashboardRepository } from "@/repositories";
import type { NewDashboardWidgetInput } from "@/repositories";
import { saveDashboardLayoutSchema, dashboardNameSchema } from "./schema";

export type SaveLayoutResult = { ok: true } | { ok: false; error: string };
export type CreateDashboardResult =
  | { ok: true; dashboardId: string }
  | { ok: false; error: string };

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

// Creates an empty dashboard and hands its id back for the client to
// navigate to. Deliberately starts with no widgets rather than the default
// set: a new dashboard exists because the user wants a different view, so
// seeding it with the standard one just means clearing it out first.
export async function createDashboard(
  name: string,
): Promise<CreateDashboardResult> {
  const parsed = dashboardNameSchema.safeParse(name);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const user = await getCurrentUser();
  const dashboard = await dashboardRepository.create(user.id, parsed.data);
  revalidatePath("/dashboard", "layout");
  return { ok: true, dashboardId: dashboard.id };
}

export async function renameDashboard(
  dashboardId: string,
  name: string,
): Promise<SaveLayoutResult> {
  const parsed = dashboardNameSchema.safeParse(name);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const user = await getCurrentUser();
  await dashboardRepository.rename(dashboardId, user.id, parsed.data);
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

// Deletes a dashboard and its widgets (via the cascade FK). The client then
// navigates to /dashboard, which resolves to whatever dashboard is left —
// or seeds a fresh "Default" if this was the last one.
export async function deleteDashboard(
  dashboardId: string,
): Promise<SaveLayoutResult> {
  const user = await getCurrentUser();
  await dashboardRepository.delete(dashboardId, user.id);
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

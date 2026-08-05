// Server actions for a dashboard: its edit-mode layout, and creating,
// renaming, or deleting the dashboard itself.
"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/auth/get-current-user";
import { dashboardRepository } from "@/repositories";
import type { DashboardWidget, NewDashboardWidgetInput } from "@/repositories";
import {
  saveDashboardLayoutSchema,
  dashboardNameSchema,
  dashboardTimeRangeSchema,
} from "./schema";

export type SaveLayoutResult = { ok: true } | { ok: false; error: string };
export type CreateDashboardResult =
  { ok: true; dashboardId: string } | { ok: false; error: string };

// Replaces a dashboard's entire widget set (Save button in edit mode).
// saveWidgets already scopes by userId and no-ops if not caller's — no extra check needed.
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

// Persists the selected time range for next visit. Caller updates local state without
// awaiting this (range only re-slices fetched data); revalidatePath just avoids a stale RSC cache.
export async function updateDashboardTimeRange(
  dashboardId: string,
  timeRange: string,
): Promise<SaveLayoutResult> {
  const parsed = dashboardTimeRangeSchema.safeParse(timeRange);
  if (!parsed.success) {
    return { ok: false, error: "That time range isn't valid." };
  }

  const user = await getCurrentUser();
  await dashboardRepository.updateTimeRange(dashboardId, user.id, parsed.data);
  revalidatePath(`/dashboard/${dashboardId}`);
  return { ok: true };
}

// Restores the default starting layout, discarding the user's arrangement —
// the "Reset to default dashboard" action in the dashboard config.
export async function resetDashboardToDefault(
  dashboardId: string,
): Promise<SaveLayoutResult & { widgets?: DashboardWidget[] }> {
  const user = await getCurrentUser();

  await dashboardRepository.resetToDefault(dashboardId, user.id);

  const dashboard = await dashboardRepository.getWithWidgets(
    dashboardId,
    user.id,
  );

  revalidatePath(`/dashboard/${dashboardId}`);

  return {
    ok: true,
    widgets: dashboard?.widgets ?? [],
  };
}

// Creates an empty dashboard and hands its id back for the client to navigate to.
// Deliberately no default widgets — a new dashboard means the user wants a different view.
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

// Deletes a dashboard and its widgets (cascade FK). Client then navigates to
// /dashboard, which resolves to another dashboard or seeds a fresh "Default".
export async function deleteDashboard(
  dashboardId: string,
): Promise<SaveLayoutResult> {
  const user = await getCurrentUser();
  await dashboardRepository.delete(dashboardId, user.id);
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

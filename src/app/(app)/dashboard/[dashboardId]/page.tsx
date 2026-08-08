// /dashboard/[dashboardId] — one user's saved dashboard (PLAN.md §3).
// 404s if missing or not caller's; getWithWidgets returns null for both, indistinguishably.
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/auth/get-current-user";
import {
  dailyLogRepository,
  userSettingsRepository,
  dashboardRepository,
} from "@/repositories";
import { toDomainDays } from "@/lib/to-domain";
import { todayIso } from "@/lib/dates";
import { buildWidgetDataBundle } from "@/lib/widget-data";
import { MIN_LOGGED_DAYS_FOR_REAL_PREVIEWS } from "@/domain/constants";
import { DashboardGrid } from "@/components/dashboard-builder/dashboard-grid";
import { DashboardSwitcher } from "@/components/dashboard-builder/dashboard-switcher";

// Always render at request time — a dashboard must reflect today's log.
export const dynamic = "force-dynamic";

export default async function DashboardViewPage({
  params,
}: {
  params: Promise<{ dashboardId: string }>;
}) {
  const { dashboardId } = await params;
  const user = await getCurrentUser();
  const dashboard = await dashboardRepository.getWithWidgets(
    dashboardId,
    user.id,
  );
  if (!dashboard) notFound();

  const [logs, { flareThreshold, chartAutoScaleYAxis }, dashboards] =
    await Promise.all([
      dailyLogRepository.listAll(user.id),
      userSettingsRepository.get(user.id),
      dashboardRepository.listForUser(user.id),
    ]);
  const days = toDomainDays(logs);
  const today = await todayIso();
  const bundle = buildWidgetDataBundle(logs, days, today, flareThreshold);
  const hasEnoughDataForPreviews =
    days.length >= MIN_LOGGED_DAYS_FOR_REAL_PREVIEWS;

  return (
    <main className="page" style={{ maxWidth: "64rem" }}>
      <header className="dashboard-header">
        <DashboardSwitcher
          dashboards={dashboards}
          currentId={dashboard.id}
          currentName={dashboard.name}
        />
      </header>

      <DashboardGrid
        dashboardId={dashboard.id}
        dashboardName={dashboard.name}
        widgets={dashboard.widgets}
        bundle={bundle}
        today={today}
        autoScaleYAxis={chartAutoScaleYAxis}
        flareThreshold={flareThreshold}
        initialRange={dashboard.timeRange}
        hasEnoughDataForPreviews={hasEnoughDataForPreviews}
      />
    </main>
  );
}

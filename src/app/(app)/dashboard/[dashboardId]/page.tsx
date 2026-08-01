// /dashboard/[dashboardId] — one user's saved dashboard (PLAN.md §3, the
// customizable-dashboard system). Server component: loads the dashboard's
// widget layout, computes every chart's data via the shared
// buildChartDataBundle (domain/dashboard-bundle.ts), and hands both to
// <DashboardGrid> for rendering. 404s if the dashboard doesn't exist or
// doesn't belong to the signed-in user — getWithWidgets returns null for
// both cases identically, since a caller shouldn't be able to distinguish
// "not found" from "not yours" for someone else's dashboard id.
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/auth/get-current-user";
import {
  dailyLogRepository,
  userSettingsRepository,
  dashboardRepository,
} from "@/repositories";
import { toDomainDays } from "@/lib/to-domain";
import { todayIso } from "@/lib/dates";
import { buildChartDataBundle } from "@/domain/dashboard-bundle";
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
  const dashboard = await dashboardRepository.getWithWidgets(dashboardId, user.id);
  if (!dashboard) notFound();

  const [logs, { flareThreshold, chartAutoScaleYAxis }, dashboards] =
    await Promise.all([
      dailyLogRepository.listAll(user.id),
      userSettingsRepository.get(user.id),
      dashboardRepository.listForUser(user.id),
    ]);
  const days = toDomainDays(logs);
  const today = await todayIso();
  const bundle = buildChartDataBundle(days, today, flareThreshold);

  return (
    <main className="page" style={{ maxWidth: "64rem" }}>
      <header className="page-header">
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
      />
    </main>
  );
}

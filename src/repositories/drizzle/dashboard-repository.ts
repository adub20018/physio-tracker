// Drizzle/libSQL implementation of DashboardRepository.
// All queries are scoped by userId and this file is the only place
// dashboard/dashboard-widget SQL lives — the rest of the app sees the
// interface. neon-http doesn't support interactive transactions, so
// multi-statement writes use db.batch(), same as DrizzleDailyLogRepository.
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { dashboards, dashboardWidgets } from "@/db/schema";
import type {
  Dashboard,
  DashboardRepository,
  DashboardWithWidgets,
  NewDashboardWidgetInput,
} from "@/repositories/types";
import { DEFAULT_DASHBOARD_WIDGETS } from "@/repositories/default-dashboard-widgets";

export class DrizzleDashboardRepository implements DashboardRepository {
  async listForUser(userId: string): Promise<Dashboard[]> {
    const rows = await db
      .select()
      .from(dashboards)
      .where(eq(dashboards.userId, userId))
      .orderBy(asc(dashboards.sortOrder), asc(dashboards.createdAt));
    return rows.map(({ id, name, sortOrder }) => ({ id, name, sortOrder }));
  }

  // Appended to the end of the user's list — sortOrder is always a
  // contiguous 0..n-1 sequence, rewritten wholesale by reorder().
  async create(userId: string, name: string): Promise<Dashboard> {
    const existing = await this.listForUser(userId);
    const [row] = await db
      .insert(dashboards)
      .values({ userId, name, sortOrder: existing.length })
      .returning();
    return { id: row.id, name: row.name, sortOrder: row.sortOrder };
  }

  async rename(id: string, userId: string, name: string): Promise<void> {
    await db
      .update(dashboards)
      .set({ name })
      .where(and(eq(dashboards.id, id), eq(dashboards.userId, userId)));
  }

  // Widgets are removed automatically by the ON DELETE CASCADE foreign key.
  async delete(id: string, userId: string): Promise<void> {
    await db
      .delete(dashboards)
      .where(and(eq(dashboards.id, id), eq(dashboards.userId, userId)));
  }

  // Independent statements (unlike saveWidgets, there's no delete-then-insert
  // ordering to preserve), so a plain Promise.all is enough — no need for
  // db.batch's fixed-length-tuple typing here.
  async reorder(userId: string, orderedIds: string[]): Promise<void> {
    await Promise.all(
      orderedIds.map((id, index) =>
        db
          .update(dashboards)
          .set({ sortOrder: index })
          .where(and(eq(dashboards.id, id), eq(dashboards.userId, userId))),
      ),
    );
  }

  async getWithWidgets(
    id: string,
    userId: string,
  ): Promise<DashboardWithWidgets | null> {
    const [row] = await db
      .select()
      .from(dashboards)
      .where(and(eq(dashboards.id, id), eq(dashboards.userId, userId)))
      .limit(1);
    if (!row) return null;

    const widgetRows = await db
      .select()
      .from(dashboardWidgets)
      .where(eq(dashboardWidgets.dashboardId, id));
    return {
      id: row.id,
      name: row.name,
      sortOrder: row.sortOrder,
      widgets: widgetRows.map((w) => ({
        id: w.id,
        widgetType: w.widgetType,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
      })),
    };
  }

  // Replace-all: confirms ownership first (a dashboard_widgets row has no
  // userId of its own to scope by directly), then swaps the whole widget
  // set in one batch so a failed write can't leave a half-saved layout.
  async saveWidgets(
    dashboardId: string,
    userId: string,
    widgets: NewDashboardWidgetInput[],
  ): Promise<void> {
    const [owned] = await db
      .select({ id: dashboards.id })
      .from(dashboards)
      .where(and(eq(dashboards.id, dashboardId), eq(dashboards.userId, userId)))
      .limit(1);
    if (!owned) return;

    await db.batch([
      db.delete(dashboardWidgets).where(eq(dashboardWidgets.dashboardId, dashboardId)),
      ...(widgets.length > 0
        ? [
            db
              .insert(dashboardWidgets)
              .values(widgets.map((w) => ({ ...w, dashboardId }))),
          ]
        : []),
    ]);
  }

  async getOrCreateDefault(userId: string): Promise<Dashboard> {
    const existing = await this.listForUser(userId);
    if (existing.length > 0) return existing[0];

    const created = await this.create(userId, "Default");
    await this.saveWidgets(created.id, userId, DEFAULT_DASHBOARD_WIDGETS);
    return created;
  }
}

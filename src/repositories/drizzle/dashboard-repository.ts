// Drizzle/libSQL implementation of DashboardRepository — all queries scoped by userId; only
// file with dashboard SQL. Multi-statement writes use db.batch() (neon-http has no transactions).
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { dashboards, dashboardWidgets } from "@/db/schema";
import type {
  Dashboard,
  DashboardRepository,
  DashboardWithWidgets,
  NewDashboardWidgetInput,
} from "@/repositories/types";
import type { TimeRange } from "@/lib/time-range";
import { DEFAULT_DASHBOARD_WIDGETS } from "@/repositories/default-dashboard-widgets";

// Deterministic id for the auto-seeded "Default" dashboard so concurrent first-visits can't
// each create one (see getOrCreateDefault). Hyphenated, not colon-separated, since a colon breaks routing.
function defaultDashboardId(userId: string): string {
  return `default-${userId}`;
}

export class DrizzleDashboardRepository implements DashboardRepository {
  async listForUser(userId: string): Promise<Dashboard[]> {
    const rows = await db
      .select()
      .from(dashboards)
      .where(eq(dashboards.userId, userId))
      .orderBy(asc(dashboards.sortOrder), asc(dashboards.createdAt));
    return rows.map(({ id, name, sortOrder, timeRange }) => ({
      id,
      name,
      sortOrder,
      timeRange,
    }));
  }

  // Appended to the end of the list — sortOrder stays a contiguous 0..n-1 sequence,
  // rewritten wholesale by reorder(). timeRange defaults via the column ("7d").
  async create(userId: string, name: string): Promise<Dashboard> {
    const existing = await this.listForUser(userId);
    const [row] = await db
      .insert(dashboards)
      .values({ userId, name, sortOrder: existing.length })
      .returning();
    return {
      id: row.id,
      name: row.name,
      sortOrder: row.sortOrder,
      timeRange: row.timeRange,
    };
  }

  async rename(id: string, userId: string, name: string): Promise<void> {
    await db
      .update(dashboards)
      .set({ name })
      .where(and(eq(dashboards.id, id), eq(dashboards.userId, userId)));
  }

  async updateTimeRange(
    id: string,
    userId: string,
    timeRange: TimeRange,
  ): Promise<void> {
    await db
      .update(dashboards)
      .set({ timeRange })
      .where(and(eq(dashboards.id, id), eq(dashboards.userId, userId)));
  }

  // Widgets are removed automatically by the ON DELETE CASCADE foreign key.
  async delete(id: string, userId: string): Promise<void> {
    await db
      .delete(dashboards)
      .where(and(eq(dashboards.id, id), eq(dashboards.userId, userId)));
  }

  // Independent statements, unlike saveWidgets — no ordering to preserve, so plain
  // Promise.all is enough (no need for db.batch's tuple typing).
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
      timeRange: row.timeRange,
      widgets: widgetRows.map((w) => ({
        id: w.id,
        widgetType: w.widgetType,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        mobileX: w.mobileX,
        mobileY: w.mobileY,
        mobileW: w.mobileW,
        mobileH: w.mobileH,
      })),
    };
  }

  // Replace-all: confirms ownership first (a dashboard_widgets row has no userId of its
  // own), then swaps the whole set in one batch so a failed write can't leave a half-saved layout.
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

  // Deliberately NOT list-then-create-if-empty: /dashboard is often hit twice at once (Next
  // prefetch + navigation), so the deterministic id makes the second insert collide and no-op instead.
  async getOrCreateDefault(userId: string): Promise<Dashboard> {
    const existing = await this.listForUser(userId);
    if (existing.length > 0) return existing[0];

    const id = defaultDashboardId(userId);
    const [inserted] = await db
      .insert(dashboards)
      .values({ id, userId, name: "Default", sortOrder: 0 })
      .onConflictDoNothing()
      .returning();

    if (!inserted) {
      // Lost the race — the winner's row (and its widgets) already exists, so use it.
      const after = await this.listForUser(userId);
      return after[0] ?? { id, name: "Default", sortOrder: 0, timeRange: "7d" };
    }

    await this.saveWidgets(id, userId, DEFAULT_DASHBOARD_WIDGETS);
    return {
      id: inserted.id,
      name: inserted.name,
      sortOrder: inserted.sortOrder,
      timeRange: inserted.timeRange,
    };
  }

  // saveWidgets already confirms ownership and no-ops for a dashboard that
  // isn't this user's, so there's nothing extra to check here.
  async resetToDefault(id: string, userId: string): Promise<void> {
    await this.saveWidgets(id, userId, DEFAULT_DASHBOARD_WIDGETS);
  }
}

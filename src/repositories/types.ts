// Repository interfaces — the contract between the app and its storage.
// UI, pages, and server actions depend on these plain-TS interfaces only,
// never on Drizzle or libSQL directly, so the storage backend can be swapped
// by writing one new implementation (PLAN.md §5).
//
// Every data method takes a userId (the signed-in Neon Auth account's id)
// and must scope its queries by it.
import type { DailyLog, ExerciseEntry, NewDailyLog, NewExerciseEntry } from "@/db/schema";

// A daily log together with the exercises performed that day — the shape most
// of the UI works with.
export type DailyLogWithExercises = DailyLog & { exercises: ExerciseEntry[] };

// Input for creating/updating a log: the log fields plus its full exercise
// list. Updates replace the exercise list wholesale (simplest correct model
// for a one-owner editing flow).
export type DailyLogInput = Omit<NewDailyLog, "id" | "userId" | "createdAt"> & {
  exercises: Omit<NewExerciseEntry, "id" | "dailyLogId">[];
};

export interface DailyLogRepository {
  // All logs for a user, oldest first, each with its exercises.
  listAll(userId: string): Promise<DailyLogWithExercises[]>;
  // A single day's log by its ISO date (YYYY-MM-DD), or null if not logged.
  findByDate(userId: string, date: string): Promise<DailyLogWithExercises | null>;
  // Creates the log for a date, or fully replaces it if one already exists.
  upsert(userId: string, input: DailyLogInput): Promise<DailyLogWithExercises>;
  // Removes a day's log (and, via cascade, its exercises).
  deleteByDate(userId: string, date: string): Promise<void>;
  // Removes every log for a user (and, via cascade, their exercises) —
  // the "delete all data" account action. Does not touch the account itself.
  deleteAll(userId: string): Promise<void>;
}

// App-level settings for one user — just the configurable values themselves,
// not DB plumbing (no userId/updatedAt), so callers don't need to know this
// is backed by a database row at all.
export type UserSettings = {
  flareThreshold: number;
  // When true, chart Y-axes scale to fit the visible data's own range
  // instead of a fixed domain.
  chartAutoScaleYAxis: boolean;
};

export interface UserSettingsRepository {
  // The user's saved settings, or the default values if they've never
  // saved any (no row yet doesn't mean an error — it means "using defaults").
  get(userId: string): Promise<UserSettings>;
  // Creates the user's settings row, or updates it if one already exists.
  // Partial: only the provided fields change, everything else keeps its
  // current (or default) value.
  upsert(userId: string, input: Partial<UserSettings>): Promise<UserSettings>;
  // Removes the user's settings row entirely, so get() falls back to
  // defaults again — part of the "delete all data" account action.
  delete(userId: string): Promise<void>;
}

// A user-created dashboard (the customizable-dashboard system) — just the
// fields a caller cares about, not DB plumbing (no userId/createdAt).
export type Dashboard = {
  id: string;
  name: string;
  sortOrder: number;
};

// One chart placed on a dashboard. widgetType is a key into the widget
// registry (src/components/dashboard-builder/widget-registry.tsx); x/y/w/h
// are react-grid-layout grid units.
export type DashboardWidget = {
  id: string;
  widgetType: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type DashboardWithWidgets = Dashboard & { widgets: DashboardWidget[] };

// Input for saveWidgets: the widget's placement/type, no id — saving a
// layout always replaces the dashboard's whole widget set wholesale
// (simplest correct model for an explicit-Save edit flow), so ids are
// regenerated rather than matched up with whatever existed before.
export type NewDashboardWidgetInput = Omit<DashboardWidget, "id">;

export interface DashboardRepository {
  // Every dashboard a user has, ordered by sortOrder then creation order.
  listForUser(userId: string): Promise<Dashboard[]>;
  // Creates a new, empty dashboard, appended to the end of the user's list.
  create(userId: string, name: string): Promise<Dashboard>;
  // Renames a dashboard. No-ops (returns without throwing) if it doesn't
  // belong to userId — callers should treat "not found" and "not yours" the
  // same way (404), so this doesn't need to distinguish them.
  rename(id: string, userId: string, name: string): Promise<void>;
  // Removes a dashboard (and, via cascade, its widgets).
  delete(id: string, userId: string): Promise<void>;
  // Persists a new relative order for a user's dashboards (the switcher's
  // list order) — orderedIds must contain exactly that user's dashboard ids.
  reorder(userId: string, orderedIds: string[]): Promise<void>;
  // A single dashboard with its widgets, or null if it doesn't exist or
  // doesn't belong to userId (callers 404 on null, same reasoning as rename).
  getWithWidgets(id: string, userId: string): Promise<DashboardWithWidgets | null>;
  // Replaces a dashboard's entire widget set — the Save action in edit mode.
  saveWidgets(
    dashboardId: string,
    userId: string,
    widgets: NewDashboardWidgetInput[],
  ): Promise<void>;
  // The user's first dashboard by sortOrder, or a freshly-seeded "Default"
  // one (see default-dashboard-widgets.ts) if they have none yet — either
  // because it's their first visit, or because they deleted every
  // dashboard they had. /dashboard redirects here.
  getOrCreateDefault(userId: string): Promise<Dashboard>;
  // Replaces a dashboard's widgets with the default starting layout,
  // discarding whatever the user had arranged — the "Reset to default
  // dashboard" action. Only touches widgets; the dashboard's own name and
  // position in the switcher are left alone.
  resetToDefault(id: string, userId: string): Promise<void>;
}

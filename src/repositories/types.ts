// Repository interfaces — the contract between the app and its storage; UI/pages/actions
// depend only on these, never on Drizzle directly. Every method scopes its queries by userId.
import type { DailyLog, ExerciseEntry, NewDailyLog, NewExerciseEntry } from "@/db/schema";
import type { TimeRange } from "@/lib/time-range";

export type DailyLogWithExercises = DailyLog & { exercises: ExerciseEntry[] };

// Log fields + full exercise list; updates replace the list wholesale.
export type DailyLogInput = Omit<NewDailyLog, "id" | "userId" | "createdAt"> & {
  exercises: Omit<NewExerciseEntry, "id" | "dailyLogId">[];
};

export interface DailyLogRepository {
  listAll(userId: string): Promise<DailyLogWithExercises[]>;
  findByDate(userId: string, date: string): Promise<DailyLogWithExercises | null>;
  // Creates the log for a date, or fully replaces it if one exists.
  upsert(userId: string, input: DailyLogInput): Promise<DailyLogWithExercises>;
  deleteByDate(userId: string, date: string): Promise<void>;
  // "Delete all data" account action; doesn't touch the account itself.
  deleteAll(userId: string): Promise<void>;
}

// Configurable values only, no DB plumbing.
export type UserSettings = {
  flareThreshold: number;
  // Chart Y-axes scale to fit visible data instead of a fixed domain.
  chartAutoScaleYAxis: boolean;
};

export interface UserSettingsRepository {
  // Falls back to defaults if no row exists yet — not an error.
  get(userId: string): Promise<UserSettings>;
  // Partial: only provided fields change.
  upsert(userId: string, input: Partial<UserSettings>): Promise<UserSettings>;
  delete(userId: string): Promise<void>;
}

// No DB plumbing (no userId/createdAt).
export type Dashboard = {
  id: string;
  name: string;
  sortOrder: number;
  // Persisted server-side so it follows the user across devices.
  timeRange: TimeRange;
};

// widgetType keys into the widget registry; x/y/w/h are grid units.
export type DashboardWidget = {
  id: string;
  widgetType: string;
  x: number;
  y: number;
  w: number;
  h: number;
  // Phone-grid placement, arranged independently; null until rearranged.
  mobileX: number | null;
  mobileY: number | null;
  mobileW: number | null;
  mobileH: number | null;
};

export type DashboardWithWidgets = Dashboard & { widgets: DashboardWidget[] };

// No id — saveWidgets always replaces the whole widget set.
export type NewDashboardWidgetInput = Omit<DashboardWidget, "id">;

export interface DashboardRepository {
  listForUser(userId: string): Promise<Dashboard[]>;
  create(userId: string, name: string): Promise<Dashboard>;
  // No-ops if the dashboard isn't userId's (treat as 404, same as "not found").
  rename(id: string, userId: string, name: string): Promise<void>;
  updateTimeRange(id: string, userId: string, timeRange: TimeRange): Promise<void>;
  delete(id: string, userId: string): Promise<void>;
  // orderedIds must contain exactly this user's dashboard ids.
  reorder(userId: string, orderedIds: string[]): Promise<void>;
  getWithWidgets(id: string, userId: string): Promise<DashboardWithWidgets | null>;
  // The Save action in edit mode — replaces the entire widget set.
  saveWidgets(
    dashboardId: string,
    userId: string,
    widgets: NewDashboardWidgetInput[],
  ): Promise<void>;
  // First dashboard by sortOrder, or a freshly-seeded "Default" one.
  getOrCreateDefault(userId: string): Promise<Dashboard>;
  // "Reset to default dashboard" — only touches widgets, not name/position.
  resetToDefault(id: string, userId: string): Promise<void>;
}

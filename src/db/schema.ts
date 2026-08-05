// Drizzle schema (Postgres/Neon) — source of truth for table shapes.
// Migrations are generated from this file via `npm run db:generate`.
import {
  pgTable,
  text,
  integer,
  real,
  jsonb,
  boolean,
  uniqueIndex,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Suggested chips in the UI; the column accepts any string (custom tags too).
export const PAIN_TYPES = [
  "ache",
  "sharp",
  "stiffness",
  "numbness-tingling",
] as const;
export type PainType = string;

export const ACTIVITY_TAGS = ["gym", "physio", "rest", "walking"] as const;
export type ActivityTag = string;

// One row per tracked day. Pain is REAL to allow half-steps (0–10 scale).
export const dailyLogs = pgTable(
  "daily_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // References neon_auth.user.id (different Postgres schema) — FK is
    // hand-written in migrations/0001_repoint-user-fk.sql, not diffable here.
    userId: uuid("user_id").notNull(),
    // ISO date (YYYY-MM-DD); unique per user, not globally.
    date: text("date").notNull(),
    steps: integer("steps"),
    painMorning: real("pain_morning"),
    painDaytime: real("pain_daytime"),
    painNight: real("pain_night"),
    activityTags: jsonb("activity_tags").$type<ActivityTag[]>(),
    painTypes: jsonb("pain_types").$type<PainType[]>(),
    generalNotes: text("general_notes"),
    sleepHours: real("sleep_hours"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("daily_logs_user_date_unique").on(table.userId, table.date),
  ],
);

// "3 sets of 20-second holds" → sets=3, durationOrReps=20, unit="seconds".
export const exerciseEntries = pgTable("exercise_entries", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  dailyLogId: text("daily_log_id")
    .notNull()
    .references(() => dailyLogs.id, { onDelete: "cascade" }),
  exerciseName: text("exercise_name").notNull(),
  sets: integer("sets").notNull(),
  durationOrReps: integer("duration_or_reps").notNull(),
  unit: text("unit", { enum: ["seconds", "reps"] })
    .notNull()
    .default("seconds"),
  // Min/max range since source data records ranges like "20-25%".
  intensityMin: real("intensity_min"),
  intensityMax: real("intensity_max"),
  notes: text("notes"),
});

// One row per user; userId is the PK (1:1, not a log with many rows).
export const userSettings = pgTable("user_settings", {
  // Same cross-schema FK situation as dailyLogs.userId — see there.
  userId: uuid("user_id").primaryKey(),
  flareThreshold: real("flare_threshold").notNull().default(3),
  // Off by default so existing charts don't change appearance unasked.
  chartAutoScaleYAxis: boolean("chart_auto_scale_y_axis").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// One row per user-created dashboard. Every user gets a seeded "Default" on
// first visit (dashboardRepository.getOrCreateDefault).
export const dashboards = pgTable("dashboards", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  // Same cross-schema FK situation as dailyLogs.userId — see there.
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  // Kept in sync by hand with lib/time-range.ts's TIME_RANGES.
  timeRange: text("time_range", { enum: ["7d", "1m", "3m", "1y", "all"] })
    .notNull()
    .default("7d"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// widgetType keys into the widget registry (code, not a DB table).
export const dashboardWidgets = pgTable("dashboard_widgets", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  dashboardId: text("dashboard_id")
    .notNull()
    .references(() => dashboards.id, { onDelete: "cascade" }),
  widgetType: text("widget_type").notNull(),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  w: integer("w").notNull(),
  h: integer("h").notNull(),
  // Phone-grid placement, arranged independently; null until rearranged.
  mobileX: integer("mobile_x"),
  mobileY: integer("mobile_y"),
  mobileW: integer("mobile_w"),
  mobileH: integer("mobile_h"),
});

export type DailyLog = typeof dailyLogs.$inferSelect;
export type NewDailyLog = typeof dailyLogs.$inferInsert;
export type ExerciseEntry = typeof exerciseEntries.$inferSelect;
export type NewExerciseEntry = typeof exerciseEntries.$inferInsert;
export type Dashboard = typeof dashboards.$inferSelect;
export type NewDashboard = typeof dashboards.$inferInsert;
export type DashboardWidgetRow = typeof dashboardWidgets.$inferSelect;
export type NewDashboardWidgetRow = typeof dashboardWidgets.$inferInsert;

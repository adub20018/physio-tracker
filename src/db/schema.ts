// Drizzle schema for the physio tracker database (SQLite/libSQL dialect).
// This is the single source of truth for table shapes — migrations are generated
// from this file via `npm run db:generate`. See PLAN.md §2 for the data model.
import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";

// Pain descriptors the user can attach to a day (multi-select, optional).
export const PAIN_TYPES = ["ache", "sharp", "stiffness", "numbness-tingling"] as const;
export type PainType = (typeof PAIN_TYPES)[number];

// Activity categories derived from the spreadsheet's activity notes.
export const ACTIVITY_TAGS = ["gym", "physio", "rest", "walking"] as const;
export type ActivityTag = (typeof ACTIVITY_TAGS)[number];

// App users. Single seeded row for now; auth fields (email, password hash)
// arrive only when real multi-user auth is built (PLAN.md §8).
export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// One row per tracked day. Every log belongs to a user from day one so that
// multi-user support later is additive, not a data migration.
// Pain values are REAL to allow half-steps (e.g. 1.5) on the 0–10 scale.
export const dailyLogs = sqliteTable(
  "daily_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    // Calendar date in ISO format (YYYY-MM-DD); unique per user, not globally.
    date: text("date").notNull(),
    steps: integer("steps"),
    painMorning: real("pain_morning"),
    painDaytime: real("pain_daytime"),
    painNight: real("pain_night"),
    // JSON arrays of tag strings (ActivityTag / PainType values).
    activityTags: text("activity_tags", { mode: "json" }).$type<ActivityTag[]>(),
    painTypes: text("pain_types", { mode: "json" }).$type<PainType[]>(),
    activityNotes: text("activity_notes"),
    generalNotes: text("general_notes"),
    sleepHours: real("sleep_hours"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("daily_logs_user_date_unique").on(table.userId, table.date)]
);

// Physio exercises performed on a given day (0..n per daily log).
// "3 sets of 20-second holds" → sets = 3, durationOrReps = 20, unit = "seconds".
// The unit flag keeps the model open to rep-based exercises later.
export const exerciseEntries = sqliteTable("exercise_entries", {
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
  // Load as % (e.g. bodyweight percentage); stored as a min/max range because
  // the source data records ranges like "20-25%". Equal values mean a fixed load.
  intensityMin: real("intensity_min"),
  intensityMax: real("intensity_max"),
  notes: text("notes"),
});

// Row types inferred from the schema, for use by the repository layer.
export type User = typeof users.$inferSelect;
export type DailyLog = typeof dailyLogs.$inferSelect;
export type NewDailyLog = typeof dailyLogs.$inferInsert;
export type ExerciseEntry = typeof exerciseEntries.$inferSelect;
export type NewExerciseEntry = typeof exerciseEntries.$inferInsert;

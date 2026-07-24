// Drizzle schema for the physio tracker database (SQLite/libSQL dialect).
// This is the single source of truth for table shapes — migrations are generated
// from this file via `npm run db:generate`. See PLAN.md §2 for the data model.
import {
  pgTable,
  text,
  integer,
  real,
  jsonb,
  uniqueIndex,
  timestamp,
} from "drizzle-orm/pg-core";

// Pain descriptors the user can attach to a day (multi-select, optional).
// PAIN_TYPES are the suggested chips shown in the UI — the column itself
// accepts any string, since the form also lets the user add a custom one.
export const PAIN_TYPES = [
  "ache",
  "sharp",
  "stiffness",
  "numbness-tingling",
] as const;
export type PainType = string;

// Activity categories derived from the spreadsheet's activity notes.
// ACTIVITY_TAGS are the suggested chips; the column accepts any string.
export const ACTIVITY_TAGS = ["gym", "physio", "rest", "walking"] as const;
export type ActivityTag = string;

// App users. Single seeded row for now; auth fields (email, password hash)
// arrive only when real multi-user auth is built (PLAN.md §8).
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// One row per tracked day. Every log belongs to a user from day one so that
// multi-user support later is additive, not a data migration.
// Pain values are REAL to allow half-steps (e.g. 1.5) on the 0–10 scale.
export const dailyLogs = pgTable(
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
    activityTags: jsonb("activity_tags").$type<ActivityTag[]>(),
    painTypes: jsonb("pain_types").$type<PainType[]>(),
    activityNotes: text("activity_notes"),
    generalNotes: text("general_notes"),
    sleepHours: real("sleep_hours"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("daily_logs_user_date_unique").on(table.userId, table.date),
  ],
);

// Physio exercises performed on a given day (0..n per daily log).
// "3 sets of 20-second holds" → sets = 3, durationOrReps = 20, unit = "seconds".
// The unit flag keeps the model open to rep-based exercises later.
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

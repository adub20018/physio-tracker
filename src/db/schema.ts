// Drizzle schema for the physio tracker database (Postgres, hosted on Neon).
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
  uuid,
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

// One row per tracked day. Every log belongs to a user from day one so that
// multi-user support later is additive, not a data migration.
// Pain values are REAL to allow half-steps (e.g. 1.5) on the 0–10 scale.
export const dailyLogs = pgTable(
  "daily_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // References neon_auth.user.id (Neon Auth's own table, in a different
    // Postgres schema in this same database). No Drizzle `.references()`
    // here — drizzle-kit can't diff a schema it doesn't own — the actual FK
    // constraint is created directly in migrations/0001_repoint-user-fk.sql
    // and enforced by Postgres regardless.
    userId: uuid("user_id").notNull(),
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

// One row per user, holding app config that used to be hardcoded constants
// (starting with the flare pain threshold — see domain/constants.ts). userId
// is the primary key rather than a separate id + unique index, since this is
// inherently a 1:1 relationship with the user, not a log with many rows.
// New settings get their own nullable/defaulted column here as they're
// added — no generic JSON blob, so every setting stays typed.
export const userSettings = pgTable("user_settings", {
  // References neon_auth.user.id — same cross-schema situation as
  // dailyLogs.userId (see the comment there); the FK constraint is
  // hand-written in migrations/0002_mature_imperial_guard.sql.
  userId: uuid("user_id").primaryKey(),
  flareThreshold: real("flare_threshold").notNull().default(3),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Row types inferred from the schema, for use by the repository layer.
export type DailyLog = typeof dailyLogs.$inferSelect;
export type NewDailyLog = typeof dailyLogs.$inferInsert;
export type ExerciseEntry = typeof exerciseEntries.$inferSelect;
export type NewExerciseEntry = typeof exerciseEntries.$inferInsert;

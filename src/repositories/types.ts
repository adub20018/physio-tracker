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

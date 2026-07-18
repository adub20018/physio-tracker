// Repository interfaces — the contract between the app and its storage.
// UI, pages, and server actions depend on these plain-TS interfaces only,
// never on Drizzle or libSQL directly, so the storage backend can be swapped
// by writing one new implementation (PLAN.md §5).
//
// Every data method takes a userId and must scope its queries by it — this is
// what makes the app multi-user ready before multi-user auth exists.
import type { DailyLog, ExerciseEntry, NewDailyLog, NewExerciseEntry, User } from "@/db/schema";

// A daily log together with the exercises performed that day — the shape most
// of the UI works with.
export type DailyLogWithExercises = DailyLog & { exercises: ExerciseEntry[] };

// Input for creating/updating a log: the log fields plus its full exercise
// list. Updates replace the exercise list wholesale (simplest correct model
// for a one-owner editing flow).
export type DailyLogInput = Omit<NewDailyLog, "id" | "userId" | "createdAt"> & {
  exercises: Omit<NewExerciseEntry, "id" | "dailyLogId">[];
};

export interface UserRepository {
  // Returns the app's single seeded user until real auth arrives.
  findFirst(): Promise<User | null>;
  findById(id: string): Promise<User | null>;
}

export interface DailyLogRepository {
  // All logs for a user, oldest first, each with its exercises.
  listAll(userId: string): Promise<DailyLogWithExercises[]>;
  // A single day's log by its ISO date (YYYY-MM-DD), or null if not logged.
  findByDate(userId: string, date: string): Promise<DailyLogWithExercises | null>;
  // Creates the log for a date, or fully replaces it if one already exists.
  upsert(userId: string, input: DailyLogInput): Promise<DailyLogWithExercises>;
  // Removes a day's log (and, via cascade, its exercises).
  deleteByDate(userId: string, date: string): Promise<void>;
}

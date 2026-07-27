// Drizzle/libSQL implementation of DailyLogRepository.
// All queries are scoped by userId (multi-user ready) and this file is the
// only place daily-log SQL lives — the rest of the app sees the interface.
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { dailyLogs, exerciseEntries, type ExerciseEntry } from "@/db/schema";
import type {
  DailyLogInput,
  DailyLogRepository,
  DailyLogWithExercises,
} from "@/repositories/types";

export class DrizzleDailyLogRepository implements DailyLogRepository {
  // All logs for a user, oldest first, with exercises attached.
  // Two queries (logs, then that user's exercises via join), grouped in
  // memory — at personal scale (hundreds of rows) this is simple and fast.
  async listAll(userId: string): Promise<DailyLogWithExercises[]> {
    const logs = await db
      .select()
      .from(dailyLogs)
      .where(eq(dailyLogs.userId, userId))
      .orderBy(asc(dailyLogs.date));
    if (logs.length === 0) return [];

    // Join through daily_logs so only this user's exercises are fetched.
    const exerciseRows = await db
      .select({ exercise: exerciseEntries })
      .from(exerciseEntries)
      .innerJoin(dailyLogs, eq(exerciseEntries.dailyLogId, dailyLogs.id))
      .where(eq(dailyLogs.userId, userId));

    const byLogId = new Map<string, ExerciseEntry[]>();
    for (const { exercise } of exerciseRows) {
      const list = byLogId.get(exercise.dailyLogId) ?? [];
      list.push(exercise);
      byLogId.set(exercise.dailyLogId, list);
    }
    return logs.map((log) => ({ ...log, exercises: byLogId.get(log.id) ?? [] }));
  }

  async findByDate(userId: string, date: string): Promise<DailyLogWithExercises | null> {
    const rows = await db
      .select()
      .from(dailyLogs)
      .where(and(eq(dailyLogs.userId, userId), eq(dailyLogs.date, date)))
      .limit(1);
    const log = rows[0];
    if (!log) return null;

    const exercises = await db
      .select()
      .from(exerciseEntries)
      .where(eq(exerciseEntries.dailyLogId, log.id));
    return { ...log, exercises };
  }

  // Create-or-replace for a given date. Runs as a batch so a failed write
  // can't leave a log with half its exercises.
  async upsert(userId: string, input: DailyLogInput): Promise<DailyLogWithExercises> {
    const { exercises, ...logFields } = input;
    const existing = await this.findByDate(userId, logFields.date);

    if (existing) {
      // Replace: update log fields, then swap the exercise list wholesale.
      await db.batch([
        db.update(dailyLogs).set(logFields).where(eq(dailyLogs.id, existing.id)),
        db.delete(exerciseEntries).where(eq(exerciseEntries.dailyLogId, existing.id)),
        ...(exercises.length > 0
          ? [
              db
                .insert(exerciseEntries)
                .values(exercises.map((ex) => ({ ...ex, dailyLogId: existing.id }))),
            ]
          : []),
      ]);
      const updated = await this.findByDate(userId, logFields.date);
      if (!updated) throw new Error(`Log for ${logFields.date} vanished during upsert`);
      return updated;
    }

    const [inserted] = await db
      .insert(dailyLogs)
      .values({ ...logFields, userId })
      .returning();
    if (exercises.length > 0) {
      await db
        .insert(exerciseEntries)
        .values(exercises.map((ex) => ({ ...ex, dailyLogId: inserted.id })));
    }
    const created = await this.findByDate(userId, logFields.date);
    if (!created) throw new Error(`Log for ${logFields.date} vanished after insert`);
    return created;
  }

  // Exercises are removed automatically by the ON DELETE CASCADE foreign key.
  async deleteByDate(userId: string, date: string): Promise<void> {
    await db
      .delete(dailyLogs)
      .where(and(eq(dailyLogs.userId, userId), eq(dailyLogs.date, date)));
  }

  // Every log for a user, in one statement — exercises cascade automatically.
  async deleteAll(userId: string): Promise<void> {
    await db.delete(dailyLogs).where(eq(dailyLogs.userId, userId));
  }
}

// Drizzle implementation of UserSettingsRepository.
// One row per user (userId is the primary key), so both operations are
// single-statement — no batch/transaction needed like DailyLogRepository.
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { userSettings } from "@/db/schema";
import { DEFAULT_FLARE_PAIN_THRESHOLD } from "@/domain/constants";
import type { UserSettings, UserSettingsRepository } from "@/repositories/types";

export class DrizzleUserSettingsRepository implements UserSettingsRepository {
  // Returns the saved row, or the app-wide defaults if the user has never
  // saved settings — a missing row isn't an error, it just means "defaults".
  async get(userId: string): Promise<UserSettings> {
    const [row] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    if (!row) return { flareThreshold: DEFAULT_FLARE_PAIN_THRESHOLD };
    return { flareThreshold: row.flareThreshold };
  }

  // Insert-or-update in one statement. Falls back to the schema's column
  // defaults for any field not present in `input` when inserting for the
  // first time; on conflict, only the provided fields are overwritten.
  async upsert(userId: string, input: Partial<UserSettings>): Promise<UserSettings> {
    const [row] = await db
      .insert(userSettings)
      .values({ userId, ...input, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { ...input, updatedAt: new Date() },
      })
      .returning();
    return { flareThreshold: row.flareThreshold };
  }
}

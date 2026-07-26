// Composition root for the repository layer: the rest of the app imports its
// repositories from here, typed as the interfaces. Swapping storage backends
// means changing which implementation is instantiated in this one file.
import type { DailyLogRepository, UserSettingsRepository } from "./types";
import { DrizzleDailyLogRepository } from "./drizzle/daily-log-repository";
import { DrizzleUserSettingsRepository } from "./drizzle/user-settings-repository";

export const dailyLogRepository: DailyLogRepository = new DrizzleDailyLogRepository();
export const userSettingsRepository: UserSettingsRepository = new DrizzleUserSettingsRepository();

export type {
  DailyLogRepository,
  DailyLogInput,
  DailyLogWithExercises,
  UserSettingsRepository,
  UserSettings,
} from "./types";

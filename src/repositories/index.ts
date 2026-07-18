// Composition root for the repository layer: the rest of the app imports its
// repositories from here, typed as the interfaces. Swapping storage backends
// means changing which implementation is instantiated in this one file.
import type { DailyLogRepository, UserRepository } from "./types";
import { DrizzleUserRepository } from "./drizzle/user-repository";
import { DrizzleDailyLogRepository } from "./drizzle/daily-log-repository";

export const userRepository: UserRepository = new DrizzleUserRepository();
export const dailyLogRepository: DailyLogRepository = new DrizzleDailyLogRepository();

export type { DailyLogRepository, UserRepository, DailyLogInput, DailyLogWithExercises } from "./types";

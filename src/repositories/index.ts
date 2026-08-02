// Composition root for the repository layer: the rest of the app imports its
// repositories from here, typed as the interfaces. Swapping storage backends
// means changing which implementation is instantiated in this one file.
import type {
  DailyLogRepository,
  UserSettingsRepository,
  DashboardRepository,
} from "./types";
import { DrizzleDailyLogRepository } from "./drizzle/daily-log-repository";
import { DrizzleUserSettingsRepository } from "./drizzle/user-settings-repository";
import { DrizzleDashboardRepository } from "./drizzle/dashboard-repository";

export const dailyLogRepository: DailyLogRepository = new DrizzleDailyLogRepository();
export const userSettingsRepository: UserSettingsRepository = new DrizzleUserSettingsRepository();
export const dashboardRepository: DashboardRepository = new DrizzleDashboardRepository();

export type {
  DailyLogRepository,
  DailyLogInput,
  DailyLogWithExercises,
  UserSettingsRepository,
  UserSettings,
  DashboardRepository,
  Dashboard,
  DashboardWidget,
  DashboardWithWidgets,
  NewDashboardWidgetInput,
} from "./types";

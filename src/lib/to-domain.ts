// Bridge between the repository layer's row shapes and the domain layer's
// pure input types. domain/ imports nothing, so this adapter lives outside
// it; every page that feeds domain functions goes through here.
import type { DailyLogWithExercises } from "@/repositories";
import type { DomainDay } from "@/domain/types";

export function toDomainDay(log: DailyLogWithExercises): DomainDay {
  return {
    date: log.date,
    steps: log.steps,
    painMorning: log.painMorning,
    painDaytime: log.painDaytime,
    painNight: log.painNight,
    sleepHours: log.sleepHours,
    exercises: log.exercises.map((ex) => ({
      sets: ex.sets,
      durationOrReps: ex.durationOrReps,
      intensityMin: ex.intensityMin,
      intensityMax: ex.intensityMax,
    })),
  };
}

// Logs arrive sorted by date ascending from the repository; the domain
// functions rely on that ordering.
export function toDomainDays(logs: DailyLogWithExercises[]): DomainDay[] {
  return logs.map(toDomainDay);
}

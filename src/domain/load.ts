// Physio volume: a single "how hard was physio today" number, so training
// load can be charted against symptoms (PLAN.md §2).
import type { DomainDay, DomainExercise } from "./types";

// Volume of one exercise entry = sets × duration(or reps) × mean intensity
// fraction. Intensity defaults to 1 (i.e. raw sets×duration) when it was
// not recorded, so early unrecorded sessions still register as load.
export function exerciseVolume(ex: DomainExercise): number {
  const { intensityMin: min, intensityMax: max } = ex;
  const meanIntensity =
    min != null && max != null
      ? (min + max) / 2 / 100
      : min != null
        ? min / 100
        : max != null
          ? max / 100
          : 1;
  return ex.sets * ex.durationOrReps * meanIntensity;
}

// Total physio load for one day (0 when no exercises were done).
export function dailyPhysioLoad(day: Pick<DomainDay, "exercises">): number {
  return day.exercises.reduce((sum, ex) => sum + exerciseVolume(ex), 0);
}

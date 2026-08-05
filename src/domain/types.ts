// Domain input shapes. domain/ imports nothing from the rest of the app
// (PLAN.md §5), so this is its own minimal view of a logged day.

// One physio exercise entry as the domain sees it.
export type DomainExercise = {
  sets: number;
  durationOrReps: number;
  // % load range; null when not recorded.
  intensityMin: number | null;
  intensityMax: number | null;
};

// One logged day as the domain sees it. Dates are ISO YYYY-MM-DD strings.
export type DomainDay = {
  date: string;
  steps: number | null;
  painMorning: number | null;
  painDaytime: number | null;
  painNight: number | null;
  sleepHours: number | null;
  exercises: DomainExercise[];
};

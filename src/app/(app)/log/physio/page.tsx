// /log/physio — the Physio exercises section on its own, reached from the
// overview's Physio tile. Still needs every log (not just the active
// date's) for the exercise-name autocomplete and to prefill a new day from
// the most recent session, same as the old combined form did.
import { getCurrentUser } from "@/auth/get-current-user";
import { dailyLogRepository } from "@/repositories";
import { resolveDateParam } from "@/lib/dates";
import { LogSectionHeader } from "@/components/ui/log/log-section-header";
import { EnsureDateParam } from "@/components/ui/log/ensure-date-param";
import { PhysioSectionForm } from "@/components/ui/log/physio-section-form";

export const dynamic = "force-dynamic";

export default async function LogPhysioPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = resolveDateParam(dateParam);

  const user = await getCurrentUser();
  const [existing, allLogs] = await Promise.all([
    dailyLogRepository.findByDate(user.id, date),
    dailyLogRepository.listAll(user.id),
  ]);

  // Exercise names ever logged, for the form's autocomplete suggestions.
  const knownExerciseNames = [
    ...new Set(allLogs.flatMap((l) => l.exercises.map((e) => e.exerciseName))),
  ].sort();

  // For a new day, prefill exercises from the most recent day that had any.
  const lastWithExercises = [...allLogs].reverse().find((l) => l.exercises.length > 0);
  const exerciseSource = existing ?? lastWithExercises;
  const exercises =
    exerciseSource?.exercises.map((ex) => ({
      exerciseName: ex.exerciseName,
      sets: ex.sets,
      durationOrReps: ex.durationOrReps,
      unit: ex.unit,
      intensityMin: ex.intensityMin,
      intensityMax: ex.intensityMax,
      // Notes belong to the specific day; only carried over when editing it.
      notes: existing ? (ex.notes ?? "") : "",
    })) ?? [];

  return (
    <main className="page" style={{ maxWidth: "36rem" }}>
      <EnsureDateParam />
      <LogSectionHeader title="Physio exercises" date={date} />
      <PhysioSectionForm key={date} init={{ date, exercises, knownExerciseNames }} />
    </main>
  );
}

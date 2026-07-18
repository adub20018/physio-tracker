// /log — the daily entry page. Server component: resolves which date is
// being logged (?date=YYYY-MM-DD, defaulting to today), loads that day's
// existing log if present, and prepares initial form values — including
// prefilling exercises from the most recent session, since a rehab program
// rarely changes day to day.
import { getCurrentUser } from "@/auth/get-current-user";
import { dailyLogRepository } from "@/repositories";
import { DailyLogForm, type DailyLogFormInit } from "@/components/ui/daily-log-form";

// Always render at request time — "today" and the loaded log must be fresh.
export const dynamic = "force-dynamic";

// Today's date in the server's local timezone. Fine for local use; when
// deployed (Phase 5), set the TZ env var on Vercel to the user's timezone so
// "today" doesn't flip over at UTC midnight.
function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateParam ?? "") ? dateParam! : todayIso();

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
      sets: String(ex.sets),
      durationOrReps: String(ex.durationOrReps),
      unit: ex.unit,
      intensityMin: ex.intensityMin != null ? String(ex.intensityMin) : "",
      intensityMax: ex.intensityMax != null ? String(ex.intensityMax) : "",
      // Notes belong to the specific day; only carried over when editing it.
      notes: existing ? (ex.notes ?? "") : "",
    })) ?? [];

  const init: DailyLogFormInit = {
    date,
    isExisting: existing != null,
    steps: existing?.steps ?? null,
    painMorning: existing?.painMorning ?? null,
    painDaytime: existing?.painDaytime ?? null,
    painNight: existing?.painNight ?? null,
    sleepHours: existing?.sleepHours ?? null,
    activityTags: existing?.activityTags ?? [],
    painTypes: existing?.painTypes ?? [],
    activityNotes: existing?.activityNotes ?? "",
    generalNotes: existing?.generalNotes ?? "",
    exercises,
    knownExerciseNames,
  };

  return (
    <main className="page" style={{ maxWidth: "36rem" }}>
      <header className="page-header">
        <h1>Daily log</h1>
        <p className="subtitle">The 30-second end-of-day check-in.</p>
      </header>
      {/* key: switching dates must remount the form with the new day's state */}
      <DailyLogForm key={date} init={init} />
    </main>
  );
}

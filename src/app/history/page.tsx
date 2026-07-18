// /history — the full data table of every logged day (the spreadsheet view,
// kept). Server component: fetches logs through the repository, flattens them
// into display-ready rows, and hands them to the client-side HistoryTable.
import { getCurrentUser } from "@/auth/get-current-user";
import { dailyLogRepository, type DailyLogWithExercises } from "@/repositories";
import { HistoryTable, type HistoryRow } from "@/components/ui/history-table";

// Always render at request time: this page shows live database contents and
// must never be frozen into a build-time snapshot.
export const dynamic = "force-dynamic";

// "Standing ankle raise 3×20s + 1×30s @25–35%" — one line per exercise name,
// set groups joined, intensity range appended when recorded.
function summarizeExercises(log: DailyLogWithExercises): string {
  const byName = new Map<string, typeof log.exercises>();
  for (const ex of log.exercises) {
    const list = byName.get(ex.exerciseName) ?? [];
    list.push(ex);
    byName.set(ex.exerciseName, list);
  }

  const lines: string[] = [];
  for (const [name, entries] of byName) {
    const unitSuffix = (e: (typeof entries)[number]) => (e.unit === "seconds" ? "s" : " reps");
    const sets = entries.map((e) => `${e.sets}×${e.durationOrReps}${unitSuffix(e)}`).join(" + ");
    const { intensityMin: min, intensityMax: max } = entries[0];
    const intensity =
      min != null ? (min === max ? ` @${min}%` : ` @${min}–${max}%`) : "";
    lines.push(`${name} ${sets}${intensity}`);
  }
  return lines.join("; ");
}

export default async function HistoryPage() {
  const user = await getCurrentUser();
  const logs = await dailyLogRepository.listAll(user.id);

  const rows: HistoryRow[] = logs.map((log) => ({
    id: log.id,
    date: log.date,
    steps: log.steps,
    painMorning: log.painMorning,
    painDaytime: log.painDaytime,
    painNight: log.painNight,
    sleepHours: log.sleepHours,
    exerciseSummary: summarizeExercises(log),
    activityTags: log.activityTags ?? [],
    notes: [log.activityNotes, log.generalNotes].filter(Boolean).join(" • "),
  }));

  return (
    <main style={{ padding: "1.5rem", maxWidth: "80rem", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "1rem" }}>History</h1>
      <p style={{ marginBottom: "1rem", opacity: 0.7 }}>
        {rows.length} logged days
      </p>
      <HistoryTable rows={rows} />
    </main>
  );
}

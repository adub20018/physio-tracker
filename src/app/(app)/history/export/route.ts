// GET /history/export — downloads every logged day as CSV (data safety:
// the data is never locked in; PLAN.md §3). One row per day, exercises
// summarized into a single readable column.
import { getCurrentUser } from "@/auth/get-current-user";
import { dailyLogRepository } from "@/repositories";
import { summarizeExercises } from "@/lib/format";
import { toCsv } from "@/lib/csv";
import { todayIso } from "@/lib/dates";

// Never cache — the export must always contain the latest logs.
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  const logs = await dailyLogRepository.listAll(user.id);

  const csv = toCsv(
    [
      "date",
      "steps",
      "pain_morning",
      "pain_daytime",
      "pain_night",
      "sleep_hours",
      "pain_types",
      "activity_tags",
      "exercises",
      "activity_notes",
      "general_notes",
    ],
    logs.map((l) => [
      l.date,
      l.steps,
      l.painMorning,
      l.painDaytime,
      l.painNight,
      l.sleepHours,
      (l.painTypes ?? []).join("; "),
      (l.activityTags ?? []).join("; "),
      summarizeExercises(l),
      l.activityNotes,
      l.generalNotes,
    ]),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="PhysiMate-${todayIso()}.csv"`,
    },
  });
}

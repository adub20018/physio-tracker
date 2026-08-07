// GET /history/export — downloads logged days as CSV so data is never locked
// in. One row per day, exercises summarized into one column. Optional ?range=
// (see lib/export-range.ts) narrows it; "custom" also needs ?from=&to=.
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/auth/get-current-user";
import { dailyLogRepository } from "@/repositories";
import { summarizeExercises } from "@/lib/format";
import { toCsv } from "@/lib/csv";
import { todayIso } from "@/lib/dates";
import { filterWindow } from "@/domain/aggregate";
import { daysForExportRange, parseExportRange } from "@/lib/export-range";
import type { DailyLogWithExercises } from "@/repositories";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const today = await todayIso();
  const allLogs = await dailyLogRepository.listAll(user.id);

  const range = parseExportRange(request.nextUrl.searchParams.get("range"));
  let logs: DailyLogWithExercises[] = allLogs;
  let filenameSuffix = "";

  if (range === "custom") {
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");
    if (from && to && ISO_DATE.test(from) && ISO_DATE.test(to)) {
      logs = allLogs.filter((l) => l.date >= from && l.date <= to);
      filenameSuffix = `-${from}-to-${to}`;
    }
    // Malformed/missing from or to: falls through to exporting everything.
  } else {
    const days = daysForExportRange(range);
    if (days != null) {
      logs = filterWindow(allLogs, today, days);
      filenameSuffix = `-${range}`;
    }
  }

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
      l.generalNotes,
    ]),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="PhysiMate-${today}${filenameSuffix}.csv"`,
    },
  });
}

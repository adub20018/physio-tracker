// /history — the full journal of every logged day (the spreadsheet view,
// kept but calmed down). Server component: fetches logs through the
// repository, flattens them into display-ready rows, and hands them to the
// client-side HistoryTable.
import { getCurrentUser } from "@/auth/get-current-user";
import { dailyLogRepository, userSettingsRepository } from "@/repositories";
import { HistoryTable, type HistoryRow } from "@/components/ui/history-table";
import { summarizeExercises, weekdayOf } from "@/lib/format";

// Always render at request time: this page shows live database contents and
// must never be frozen into a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await getCurrentUser();
  const [logs, { flareThreshold }] = await Promise.all([
    dailyLogRepository.listAll(user.id),
    userSettingsRepository.get(user.id),
  ]);

  const rows: HistoryRow[] = logs.map((log) => ({
    id: log.id,
    date: log.date,
    weekday: weekdayOf(log.date),
    steps: log.steps,
    painMorning: log.painMorning,
    painDaytime: log.painDaytime,
    painNight: log.painNight,
    sleepHours: log.sleepHours,
    exerciseSummary: summarizeExercises(log),
    activityTags: log.activityTags ?? [],
    painTypes: log.painTypes ?? [],
    activityNotes: log.activityNotes ?? "",
    generalNotes: log.generalNotes ?? "",
  }));

  return (
    <main className="page" style={{ maxWidth: "64rem" }}>
      <header
        className="page-header"
        style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}
      >
        <div>
          <h1>History</h1>
          <p className="subtitle">
            {/* Template literal, not text + {expr} — see page.tsx's dashboard
                subtitle for why the plain version silently loses the space
                after the number. */}
            {`${rows.length} logged days · click a row's arrow for notes and detail`}
          </p>
        </div>
        {/* Plain anchor: a download must be a real navigation, not a client route */}
        <a
          href="/history/export"
          download
          style={{ color: "var(--accent)", fontSize: "0.85rem", whiteSpace: "nowrap" }}
        >
          ⤓ Export CSV
        </a>
      </header>
      <HistoryTable rows={rows} flareThreshold={flareThreshold} />
    </main>
  );
}

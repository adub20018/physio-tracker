// /log — the overview: pick a date once, then tap into whichever section
// you actually have data for right now. Replaces the old one-long-form
// page: logging happens in short, separate visits throughout the day
// (morning pain, midday physio, evening steps, …), so the page you land on
// shows what's done and what's left for the active date rather than every
// field at once.
import Link from "next/link";
import { getCurrentUser } from "@/auth/get-current-user";
import { dailyLogRepository } from "@/repositories";
import { resolveDateParam } from "@/lib/dates";
import {
  painSummary,
  painProgress,
  activitySummary,
  activityProgress,
  physioSummary,
  physioProgress,
  notesSummary,
  notesProgress,
} from "@/lib/log-summaries";
import { LogDateBar } from "@/components/ui/log-date-bar";
import { SegmentProgress } from "@/components/ui/segment-progress";
import styles from "./log-overview.module.css";

// Always render at request time — the active date's log must be fresh.
export const dynamic = "force-dynamic";

export default async function LogOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = resolveDateParam(dateParam);

  const user = await getCurrentUser();
  const existing = await dailyLogRepository.findByDate(user.id, date);

  const tiles = [
    {
      href: `/log/pain?date=${date}`,
      title: "Pain",
      summary: painSummary(existing),
      progress: painProgress(existing),
    },
    {
      href: `/log/activity?date=${date}`,
      title: "Activity",
      summary: activitySummary(existing),
      progress: activityProgress(existing),
    },
    {
      href: `/log/physio?date=${date}`,
      title: "Physio exercises",
      summary: physioSummary(existing),
      progress: physioProgress(existing),
    },
    {
      href: `/log/notes?date=${date}`,
      title: "Notes",
      summary: notesSummary(existing),
      progress: notesProgress(existing),
    },
  ];

  return (
    <main className="page" style={{ maxWidth: "36rem" }}>
      <header className="page-header">
        <h1>Daily log</h1>
        <p className="subtitle">Pick what you&apos;re logging right now.</p>
      </header>

      <LogDateBar date={date} />

      <div className={styles.tiles}>
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`${styles.tile} ${t.progress.filled === 0 ? styles.tileEmpty : ""}`}
          >
            <SegmentProgress filled={t.progress.filled} total={t.progress.total} />
            <div className={styles.tileBody}>
              <div className={styles.tileHeader}>
                <span className={styles.tileTitle}>{t.title}</span>
                <span className={styles.tileCount}>
                  {t.progress.filled}/{t.progress.total}
                </span>
              </div>
              <span className={styles.tileSummary}>{t.summary}</span>
            </div>
          </Link>
        ))}
      </div>

      <Link href={`/log/review?date=${date}`} className={styles.reviewLink}>
        Review full day →
      </Link>
    </main>
  );
}

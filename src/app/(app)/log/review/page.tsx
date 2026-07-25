// /log/review — the final look-over: every section's summary for one
// date on a single screen, read-only, with an Edit link back into each
// section. For checking the whole day is complete before bed, without
// the day-to-day form of logging living on this same page.
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
  notesFullText,
  notesProgress,
} from "@/lib/log-summaries";
import { LogSectionHeader } from "@/components/ui/log-section-header";
import { SegmentProgress } from "@/components/ui/segment-progress";
import sharedStyles from "@/components/ui/log-shared.module.css";
import styles from "./review.module.css";

export const dynamic = "force-dynamic";

export default async function LogReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = resolveDateParam(dateParam);

  const user = await getCurrentUser();
  const existing = await dailyLogRepository.findByDate(user.id, date);

  const sections = [
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
      summary: notesFullText(existing),
      progress: notesProgress(existing),
    },
  ];

  return (
    <main className="page" style={{ maxWidth: "36rem" }}>
      <LogSectionHeader title="Full day review" date={date} />
      <div className={sharedStyles.form}>
        {sections.map((s) => (
          <section key={s.href} className={styles.progressCard}>
            <SegmentProgress filled={s.progress.filled} total={s.progress.total} />
            <div className={styles.cardBody}>
              <div className={styles.cardHeader}>
                <h2 className={sharedStyles.cardTitle}>{s.title}</h2>
                <div className={styles.cardHeaderRight}>
                  <span className={styles.count}>
                    {s.progress.filled}/{s.progress.total}
                  </span>
                  <Link href={s.href} className={styles.editLink}>
                    Edit
                  </Link>
                </div>
              </div>
              <p className={s.progress.filled === 0 ? styles.empty : styles.summary}>
                {s.summary}
              </p>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

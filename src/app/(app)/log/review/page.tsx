// /log/review — read-only summary of every section for one date, with an
// Edit link back into each — for checking a day is complete before bed.
import Link from "next/link";
import { getCurrentUser } from "@/auth/get-current-user";
import { dailyLogRepository } from "@/repositories";
import { resolveDateParam } from "@/lib/dates";
import { BoneFracture } from "lucide-react";
import { Dumbbell } from "lucide-react";
import { StickyNote } from "lucide-react";
import {
  painProgress,
  activityProgress,
  physioProgress,
  notesProgress,
} from "@/lib/log-summaries";
import {
  Sunrise,
  Sun,
  Moon,
  Footprints,
  BedDouble,
  StickyNoteCheck,
  SportShoe,
  Repeat2,
  Activity,
} from "lucide-react";
import { LogSectionHeader } from "@/components/ui/log/log-section-header";
import { SegmentProgress } from "@/components/ui/log/segment-progress";
import sharedStyles from "@/components/ui/log/log-shared.module.css";
import styles from "./review.module.css";

export const dynamic = "force-dynamic";

export default async function LogReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = await resolveDateParam(dateParam);

  const user = await getCurrentUser();
  const existing = await dailyLogRepository.findByDate(user.id, date);

  const sections = [
    {
      href: `/log/pain?date=${date}`,
      title: "Pain",
      icons: [<BoneFracture key="pain" size={16} />],
      summary: (
        <div className={styles.summaryContainer}>
          <span className={styles.summaryText}>
            <Sunrise size={14} /> {existing?.painMorning ?? "—"}
          </span>

          <span className={styles.summaryText}>
            <Sun size={14} /> {existing?.painDaytime ?? "—"}
          </span>

          <span className={styles.summaryText}>
            <Moon size={14} /> {existing?.painNight ?? "—"}
          </span>
        </div>
      ),
      progress: painProgress(existing),
    },
    {
      href: `/log/activity?date=${date}`,
      title: "Activity",
      icons: [
        <Footprints key="steps" size={16} />,
        <BedDouble key="sleep" size={16} />,
      ],
      summary: (
        <div className={styles.summaryContainer}>
          <span className={styles.summaryText}>
            <Footprints size={14} /> {existing?.steps ?? "—"}
          </span>

          <span className={styles.summaryText}>
            <BedDouble size={14} />{" "}
            {existing?.sleepHours != null ? `${existing.sleepHours} hrs` : "—"}
          </span>
        </div>
      ),
      progress: activityProgress(existing),
    },
    {
      href: `/log/physio?date=${date}`,
      title: "Physio exercises",
      icons: [<Dumbbell key="exercise" size={16} />],
      summary: (
        <div className={styles.summaryContainer} id={styles.exerciseSummary}>
          {existing?.exercises.map((exercise) => {
            // Displays exercise intensity correctly for all cases (if intensityMin is empty, if intensityMax is empty, both empty, or both full)
            let exerciseIntensity = ``;

            // Only display intensityMin (if intensityMax does not exist or is not larger than intensityMin)
            if (
              exercise.intensityMin != null &&
              (exercise.intensityMax == null ||
                exercise.intensityMax <= exercise.intensityMin)
            ) {
              exerciseIntensity = `${exercise.intensityMin}`;
            }
            // Display intensityMin - intensityMax (if both are valid, and intensityMax is larger than intensityMin)
            else if (
              exercise.intensityMin != null &&
              exercise.intensityMax != null &&
              exercise.intensityMax > exercise.intensityMin
            ) {
              exerciseIntensity = `${exercise.intensityMin}–${exercise.intensityMax}`;
            }
            // Display only intensityMax if intensityMin is missing
            else if (
              exercise.intensityMin == null &&
              exercise.intensityMax != null
            ) {
              exerciseIntensity = `${exercise.intensityMax}`;
            }
            return (
              <div key={exercise.id} className={styles.exerciseContainer}>
                <span className={styles.summaryText} id={styles.exerciseTitle}>
                  <SportShoe size={14} />
                  {exercise.exerciseName}
                </span>
                <div className={styles.exerciseStats}>
                  <span className={styles.summaryText}>
                    <Repeat2 size={14} />
                    {exercise.sets}×{exercise.durationOrReps}
                  </span>

                  {exerciseIntensity ? (
                    <span className={styles.summaryText}>
                      <Activity size={14} />
                      {exerciseIntensity}%
                    </span>
                  ) : (
                    ""
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ),
      progress: physioProgress(existing),
    },
    {
      href: `/log/notes?date=${date}`,
      title: "Notes",
      icons: [<StickyNote key="notes" size={16} />],
      summary: (
        <div className={styles.summaryContainer}>
          <span className={styles.summaryText}>
            <StickyNoteCheck size={14} /> {existing?.generalNotes ?? "—"}
          </span>
        </div>
      ),
      progress: notesProgress(existing),
    },
  ];

  return (
    <main className="page" style={{ maxWidth: "36rem" }}>
      <LogSectionHeader title="Full day review" date={date} />
      <div className={sharedStyles.form}>
        {sections.map((s) => (
          <section key={s.href} className={styles.progressCard}>
            <SegmentProgress
              filled={s.progress.filled}
              total={s.progress.total}
            />
            <div className={styles.cardBody}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>
                  {s.title}
                  <span className={styles.tileIcons}>{s.icons}</span>
                </span>
                <div className={styles.cardHeaderRight}>
                  <span className={styles.count}>
                    {s.progress.filled}/{s.progress.total}
                  </span>
                  <Link href={s.href} className={styles.editLink}>
                    Edit
                  </Link>
                </div>
              </div>
              <span
                className={
                  s.progress.filled === 0 ? styles.empty : styles.summary
                }
              >
                {s.summary}
              </span>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

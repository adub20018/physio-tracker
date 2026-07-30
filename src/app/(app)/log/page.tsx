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
  painProgress,
  activityProgress,
  physioProgress,
  notesProgress,
} from "@/lib/log-summaries";

import { LogDateBar } from "@/components/ui/log/log-date-bar";
import { SegmentProgress } from "@/components/ui/log/segment-progress";
import { BoneFracture } from "lucide-react";
import { Dumbbell } from "lucide-react";
import { StickyNote } from "lucide-react";
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
  Zap,
} from "lucide-react";
import styles from "./log-overview.module.css";
import { SERIES } from "@/components/charts/chart-theme";

// Always render at request time — the active date's log must be fresh.
export const dynamic = "force-dynamic";

export default async function LogOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = await resolveDateParam(dateParam);

  const user = await getCurrentUser();
  const existing = await dailyLogRepository.findByDate(user.id, date);

  const tiles = [
    {
      href: `/log/pain?date=${date}`,
      title: "Pain",
      // Single icon: pain readings are all one kind of input (a 0–10 scale,
      // three times a day), unlike Activity's two distinct fields below.
      icons: [<BoneFracture key="pain" size={16} />],
      badgeStyle: {
        background: `color-mix(in srgb, ${SERIES.pain} 14%, transparent)`,
        color: SERIES.pain,
      },
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
      // Two icons, one per distinct field this section actually logs —
      // same icons used on the Steps/Sleep inputs inside the section form
      // itself, so the tile previews exactly what's behind it.
      icons: [<Zap key="activity" size={16} />],
      badgeStyle: {
        background: `color-mix(in srgb, ${SERIES.steps} 14%, transparent)`,
        color: SERIES.steps,
      },
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
      badgeStyle: {
        background: `color-mix(in srgb, ${SERIES.load} 14%, transparent)`,
        color: SERIES.load,
      },
      // summary: physioSummary(existing),
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
      badgeStyle: {
        background: `color-mix(in srgb, ${SERIES.holdVolume} 14%, transparent)`,
        color: SERIES.holdVolume,
      },
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
            <SegmentProgress
              filled={t.progress.filled}
              total={t.progress.total}
            />
            <div className={styles.tileBody}>
              <div className={styles.tileHeader}>
                <span className={styles.tileTitle}>{t.title}</span>
                <span className={styles.iconBadge} style={t.badgeStyle}>
                  {t.icons}
                </span>
              </div>
              <span className={styles.tileSummary}>{t.summary}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className={styles.footerLinks}>
        <Link href={`/log/review?date=${date}`} className={styles.reviewLink}>
          Review full day →
        </Link>
        <Link href="/log/import" className={styles.importLink}>
          Import from spreadsheet
        </Link>
      </div>
    </main>
  );
}

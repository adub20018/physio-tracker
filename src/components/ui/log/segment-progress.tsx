// A progress bar cut into one equal segment per loggable input in a
// section (3 for Pain's readings, 2 for Activity's steps/sleep, …) — each
// segment fills in as that input gets logged, so completeness reads at a
// glance without parsing the summary text. Used by the /log overview's
// tiles and the review page's section cards.
import styles from "./segment-progress.module.css";

export function SegmentProgress({ filled, total }: { filled: number; total: number }) {
  return (
    <div
      className={styles.track}
      role="progressbar"
      aria-valuenow={filled}
      aria-valuemin={0}
      aria-valuemax={total}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`${styles.segment} ${i < filled ? styles.segmentFilled : ""}`}
        />
      ))}
    </div>
  );
}

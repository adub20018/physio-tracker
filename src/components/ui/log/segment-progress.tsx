// A progress bar split into one segment per loggable input in a section (3
// for Pain, 2 for Activity, …) — fills in as each input is logged, so completeness reads at a glance.
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

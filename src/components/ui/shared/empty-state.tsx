// Placeholder for a chart/table with no data yet — avoids a blank axis or
// header-only table reading as broken, and links straight to /log.
import Link from "next/link";
import styles from "./empty-state.module.css";

export function EmptyState({
  message = "No data yet.",
  height,
  // Fill the available height instead of reserving `height` pixels — used
  // by resizable dashboard widgets, where the cell's height is the truth.
  fill = false,
}: {
  message?: string;
  height?: number;
  fill?: boolean;
}) {
  return (
    <div
      className={fill ? `${styles.root} ${styles.fill}` : styles.root}
      style={!fill && height != null ? { height } : undefined}
    >
      <p className={styles.message}>{message}</p>
      <Link href="/log" className={styles.link}>
        Log your data →
      </Link>
    </div>
  );
}

// Placeholder shown instead of a chart or table when there's no data yet —
// keeps a blank axis grid or header-only table from reading as broken, and
// points straight at /log, the only way to fix it.
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

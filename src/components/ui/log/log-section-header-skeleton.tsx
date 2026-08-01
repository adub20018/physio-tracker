// Shimmering placeholder shaped like LogSectionHeader (back link + title +
// active date) — shared by every /log section page's loading.tsx (Pain,
// Activity, Physio, Notes, Review), since they all use the same header.
import { Skeleton } from "@primereact/ui/skeleton";
import styles from "./log-section-header.module.css";

export function LogSectionHeaderSkeleton() {
  return (
    <div className={styles.header}>
      <Skeleton width="3.5rem" height="0.85rem" borderRadius="4px" />
      <div className={styles.titleRow}>
        <Skeleton width="9rem" height="1.6rem" borderRadius="4px" />
        <Skeleton width="6rem" height="0.85rem" borderRadius="4px" />
      </div>
    </div>
  );
}

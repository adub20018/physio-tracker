// Instant loading state for /log/activity — see the dashboard's loading.tsx
// for why this file exists. Shaped like the real form (steps/sleep fields
// + activity-type chips + Save) so the swap-in doesn't jump the layout.
import { Skeleton } from "@primereact/ui/skeleton";
import { LogSectionHeaderSkeleton } from "@/components/ui/log/log-section-header-skeleton";
import styles from "@/components/ui/log/log-shared.module.css";

export default function LogActivityLoading() {
  return (
    <main className="page" style={{ maxWidth: "36rem" }}>
      <LogSectionHeaderSkeleton />
      <div className={styles.form}>
        <section className={styles.card}>
          <Skeleton width="5rem" height="1.05rem" borderRadius="4px" />
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <Skeleton width="4rem" height="0.72rem" borderRadius="4px" />
              <Skeleton height="2.5rem" borderRadius="8px" />
            </div>
            <div className={styles.field}>
              <Skeleton width="4rem" height="0.72rem" borderRadius="4px" />
              <Skeleton height="2.5rem" borderRadius="8px" />
            </div>
          </div>
          <div className={styles.subsection}>
            <Skeleton width="6rem" height="0.72rem" borderRadius="4px" />
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <Skeleton width="4rem" height="2.1rem" borderRadius="8px" />
              <Skeleton width="4.5rem" height="2.1rem" borderRadius="8px" />
              <Skeleton width="4rem" height="2.1rem" borderRadius="8px" />
              <Skeleton width="5rem" height="2.1rem" borderRadius="8px" />
            </div>
          </div>
        </section>
        <Skeleton height="3rem" borderRadius="8px" />
      </div>
    </main>
  );
}

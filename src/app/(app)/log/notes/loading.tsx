// Instant loading state for /log/notes — see the dashboard's loading.tsx
// for why this file exists. Shaped like the real form (one textarea +
// Save) so the swap-in doesn't jump the layout.
import { Skeleton } from "@primereact/ui/skeleton";
import { LogSectionHeaderSkeleton } from "@/components/ui/log/log-section-header-skeleton";
import styles from "@/components/ui/log/log-shared.module.css";

export default function LogNotesLoading() {
  return (
    <main className="page" style={{ maxWidth: "36rem" }}>
      <LogSectionHeaderSkeleton />
      <div className={styles.form}>
        <section className={styles.card}>
          <Skeleton width="4rem" height="1.05rem" borderRadius="4px" />
          <div className={styles.field}>
            <Skeleton width="7rem" height="0.72rem" borderRadius="4px" />
            <Skeleton height="6rem" borderRadius="8px" />
          </div>
        </section>
        <Skeleton height="3rem" borderRadius="8px" />
      </div>
    </main>
  );
}

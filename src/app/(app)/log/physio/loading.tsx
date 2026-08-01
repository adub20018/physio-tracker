// Instant loading state for /log/physio — see the dashboard's loading.tsx
// for why this file exists. Shaped like one exercise card (name + 2x2
// sets/duration/intensity fields) + Add exercise + Save; the real page can
// have any number of exercise cards, so this just shows a representative
// one rather than guessing a count.
import { Skeleton } from "@primereact/ui/skeleton";
import { LogSectionHeaderSkeleton } from "@/components/ui/log/log-section-header-skeleton";
import styles from "@/components/ui/log/log-shared.module.css";

function ExerciseCardSkeleton() {
  return (
    <div className={styles.exerciseCard}>
      <div className={styles.exerciseHeader}>
        <Skeleton height="2.5rem" borderRadius="8px" style={{ flex: 1 }} />
        <Skeleton width="1.5rem" height="1.5rem" borderRadius="4px" />
      </div>
      <div className={styles.exerciseGrid}>
        <Skeleton height="2.5rem" borderRadius="8px" />
        <Skeleton height="2.5rem" borderRadius="8px" />
        <Skeleton height="2.5rem" borderRadius="8px" />
        <Skeleton height="2.5rem" borderRadius="8px" />
      </div>
    </div>
  );
}

export default function LogPhysioLoading() {
  return (
    <main className="page" style={{ maxWidth: "36rem" }}>
      <LogSectionHeaderSkeleton />
      <div className={styles.form}>
        <section className={styles.card}>
          <Skeleton width="8rem" height="1.05rem" borderRadius="4px" />
          <ExerciseCardSkeleton />
          <Skeleton width="8rem" height="2.25rem" borderRadius="8px" />
        </section>
        <Skeleton height="3rem" borderRadius="8px" />
      </div>
    </main>
  );
}

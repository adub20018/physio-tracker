// Instant loading state for /log/pain — see the dashboard's loading.tsx
// for why this file exists. Shaped like the real form (three pain sliders
// + pain-type chips + Save) so the swap-in doesn't jump the layout.
import { Skeleton } from "@primereact/ui/skeleton";
import { LogSectionHeaderSkeleton } from "@/components/ui/log/log-section-header-skeleton";
import styles from "@/components/ui/log/log-shared.module.css";

function PainRowSkeleton() {
  return (
    <div className={styles.painRow}>
      <div className={styles.painHeader}>
        <Skeleton width="5rem" height="0.85rem" borderRadius="4px" />
        <Skeleton width="2.5rem" height="0.85rem" borderRadius="4px" />
      </div>
      <Skeleton height="1.25rem" borderRadius="999px" />
    </div>
  );
}

export default function LogPainLoading() {
  return (
    <main className="page" style={{ maxWidth: "36rem" }}>
      <LogSectionHeaderSkeleton />
      <div className={styles.form}>
        <section className={styles.card}>
          <Skeleton width="4rem" height="1.05rem" borderRadius="4px" />
          <PainRowSkeleton />
          <PainRowSkeleton />
          <PainRowSkeleton />
          <div className={styles.subsection}>
            <Skeleton width="6rem" height="0.72rem" borderRadius="4px" />
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
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

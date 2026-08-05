// Loading skeleton for /log/review, shaped like the real page's four
// per-section summary cards (see dashboard's loading.tsx for why this exists).
import { Skeleton } from "@primereact/ui/skeleton";
import { LogSectionHeaderSkeleton } from "@/components/ui/log/log-section-header-skeleton";
import sharedStyles from "@/components/ui/log/log-shared.module.css";
import styles from "./review.module.css";

function ProgressCardSkeleton() {
  return (
    <section className={styles.progressCard}>
      <Skeleton height="4px" borderRadius="0" />
      <div className={styles.cardBody}>
        <div className={styles.cardHeader}>
          <Skeleton width="5rem" height="1.05rem" borderRadius="4px" />
          <div className={styles.cardHeaderRight}>
            <Skeleton width="2rem" height="0.78rem" borderRadius="4px" />
            <Skeleton width="2.5rem" height="0.85rem" borderRadius="4px" />
          </div>
        </div>
        <Skeleton width="70%" height="0.9rem" borderRadius="4px" />
      </div>
    </section>
  );
}

export default function LogReviewLoading() {
  return (
    <main className="page" style={{ maxWidth: "36rem" }}>
      <LogSectionHeaderSkeleton />
      <div className={sharedStyles.form}>
        <ProgressCardSkeleton />
        <ProgressCardSkeleton />
        <ProgressCardSkeleton />
        <ProgressCardSkeleton />
      </div>
    </main>
  );
}

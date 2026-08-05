// Instant loading state for /dashboard, auto-wrapped in Suspense by Next.
// Lives here (not (app)/layout.tsx) so it doesn't flash on nav to every route.
import { CardSkeleton, StatTileSkeleton } from "@/components/ui/shared/card-skeleton";
import { Skeleton } from "@primereact/ui/skeleton";
import styles from "@/components/ui/dashboard/dashboard.module.css";

export default function DashboardLoading() {
  return (
    <main className="page" style={{ maxWidth: "64rem" }}>
      <header className="page-header">
        <Skeleton width="14rem" height="1.6rem" borderRadius="4px" />
        <div style={{ marginTop: "0.5rem" }}>
          <Skeleton width="11rem" height="0.9rem" borderRadius="4px" />
        </div>
      </header>

      <div className={styles.tiles}>
        <StatTileSkeleton />
        <StatTileSkeleton />
        <StatTileSkeleton />
        <StatTileSkeleton />
      </div>

      <CardSkeleton contentHeight={260} />
      <CardSkeleton contentHeight={260} />
      <CardSkeleton contentHeight={200} />
      <CardSkeleton contentHeight={180} />
    </main>
  );
}

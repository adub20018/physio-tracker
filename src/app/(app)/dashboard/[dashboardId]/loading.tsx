// Instant loading state for /dashboard/[dashboardId], shaped like the
// seeded "Default" dashboard as a generic approximation for custom layouts.
import { CardSkeleton, StatTileSkeleton } from "@/components/ui/shared/card-skeleton";
import { Skeleton } from "@primereact/ui/skeleton";
import styles from "@/components/ui/dashboard/dashboard.module.css";

export default function DashboardViewLoading() {
  return (
    <main className="page" style={{ maxWidth: "64rem" }}>
      <header className="page-header">
        <Skeleton width="10rem" height="1.6rem" borderRadius="4px" />
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

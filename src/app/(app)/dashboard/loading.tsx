// Instant loading state for /dashboard. Next.js wraps page.tsx in this
// folder in a Suspense boundary automatically — shown the moment navigation
// starts, swapped for the real page once its data resolves. Shape roughly
// matches the real page (stat tile row + chart cards) so there's minimal
// layout shift on the swap.
//
// Deliberately lives in its own dashboard/ segment, not alongside the
// shared (app)/layout.tsx — a loading.tsx co-located with a layout wraps
// every nested route below it too, so when it lived at (app)/loading.tsx,
// navigating to ANY other route for the first time (before that route's own
// loading.tsx chunk had loaded) would flash THIS skeleton first. Being
// nested here means it only ever applies to /dashboard.
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

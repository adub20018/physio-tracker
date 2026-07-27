// Instant loading state for /insights — see the dashboard's loading.tsx for
// why this file exists. Shape matches the three correlation cards plus the
// flare review and weekly report sections below them.
import { CardSkeleton } from "@/components/ui/shared/card-skeleton";
import { Skeleton } from "@primereact/ui/skeleton";

export default function InsightsLoading() {
  return (
    <main className="page" style={{ maxWidth: "64rem" }}>
      <header className="page-header">
        <Skeleton width="8rem" height="1.6rem" borderRadius="4px" />
        <div style={{ marginTop: "0.5rem" }}>
          <Skeleton width="20rem" height="0.9rem" borderRadius="4px" />
        </div>
      </header>

      <CardSkeleton contentHeight={240} />
      <CardSkeleton contentHeight={240} />
      <CardSkeleton contentHeight={260} />
      <CardSkeleton contentHeight={160} />
      <CardSkeleton contentHeight={220} />
    </main>
  );
}

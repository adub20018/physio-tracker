// Instant loading state for /history — see the dashboard's loading.tsx for
// why this file exists. A handful of row-shaped bars stand in for the
// table, wrapped in the same card shape the real table renders inside.
import { CardSkeleton } from "@/components/ui/shared/card-skeleton";
import { Skeleton } from "@primereact/ui/skeleton";

export default function HistoryLoading() {
  return (
    <main className="page" style={{ maxWidth: "64rem" }}>
      <header className="page-header">
        <Skeleton width="9rem" height="1.6rem" borderRadius="4px" />
        <div style={{ marginTop: "0.5rem" }}>
          <Skeleton width="16rem" height="0.9rem" borderRadius="4px" />
        </div>
      </header>

      <CardSkeleton contentHeight={320} />
    </main>
  );
}

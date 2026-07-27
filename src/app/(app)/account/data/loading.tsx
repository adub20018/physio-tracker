// Instant loading state for /account/data — see the dashboard's
// loading.tsx for why this file exists.
import { PageSpinner } from "@/components/ui/shared/page-spinner";

export default function DataLoading() {
  return (
    <main className="page" style={{ maxWidth: "36rem" }}>
      <PageSpinner />
    </main>
  );
}

// Instant loading state for /account/security — see the dashboard's
// loading.tsx for why this file exists.
import { PageSpinner } from "@/components/ui/shared/page-spinner";

export default function SecurityLoading() {
  return (
    <main className="page" style={{ maxWidth: "36rem" }}>
      <PageSpinner />
    </main>
  );
}

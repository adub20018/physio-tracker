// Instant loading state for /log/pain — see the dashboard's loading.tsx for
// why this file exists.
import { PageSpinner } from "@/components/ui/shared/page-spinner";

export default function LogPainLoading() {
  return (
    <main className="page" style={{ maxWidth: "36rem" }}>
      <PageSpinner />
    </main>
  );
}

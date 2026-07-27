// Instant loading state for /log/review — see the dashboard's loading.tsx
// for why this file exists.
import { PageSpinner } from "@/components/ui/shared/page-spinner";

export default function LogReviewLoading() {
  return (
    <main className="page" style={{ maxWidth: "36rem" }}>
      <PageSpinner />
    </main>
  );
}

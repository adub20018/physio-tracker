// Instant loading state for /log/physio — see the dashboard's loading.tsx
// for why this file exists.
import { PageSpinner } from "@/components/ui/shared/page-spinner";

export default function LogPhysioLoading() {
  return (
    <main className="page" style={{ maxWidth: "36rem" }}>
      <PageSpinner />
    </main>
  );
}

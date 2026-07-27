// Instant loading state for /account/preferences — see the dashboard's
// loading.tsx for why this file exists.
import { PageSpinner } from "@/components/ui/shared/page-spinner";

export default function PreferencesLoading() {
  return (
    <main className="page" style={{ maxWidth: "30rem" }}>
      <PageSpinner />
    </main>
  );
}

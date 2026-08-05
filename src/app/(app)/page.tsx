// Temporary stub: dashboard moved to /dashboard so its loading.tsx wouldn't
// cascade to every route under (app)/layout.tsx. Replace with a real landing page.
import { redirect } from "next/navigation";

export default function RootRedirect() {
  redirect("/dashboard");
}

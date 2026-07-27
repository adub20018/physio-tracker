// / — temporary stub. The dashboard moved to /dashboard (see that folder's
// page.tsx) so its loading.tsx no longer sits alongside the shared
// (app)/layout.tsx and cascade to every other route. This redirect keeps
// "/" working for signed-in users in the meantime; replace it once the
// intended public landing page lives here instead.
import { redirect } from "next/navigation";

export default function RootRedirect() {
  redirect("/dashboard");
}

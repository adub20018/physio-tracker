// /dashboard — resolves to the signed-in user's first dashboard by
// sortOrder (typically "Default"), creating one seeded with today's
// starting layout if they don't have any yet (first visit, or every
// dashboard was deleted — see dashboardRepository.getOrCreateDefault).
// The actual rendering lives at /dashboard/[dashboardId] now; this segment
// only ever redirects.
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/auth/get-current-user";
import { dashboardRepository } from "@/repositories";

export const dynamic = "force-dynamic";

export default async function DashboardRedirectPage() {
  const user = await getCurrentUser();
  const dashboard = await dashboardRepository.getOrCreateDefault(user.id);
  redirect(`/dashboard/${dashboard.id}`);
}

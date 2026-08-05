// /dashboard — redirects to the user's first dashboard by sortOrder,
// creating a seeded default if none exist yet. Actual rendering lives at /dashboard/[dashboardId].
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/auth/get-current-user";
import { dashboardRepository } from "@/repositories";

export const dynamic = "force-dynamic";

export default async function DashboardRedirectPage() {
  const user = await getCurrentUser();
  const dashboard = await dashboardRepository.getOrCreateDefault(user.id);
  redirect(`/dashboard/${dashboard.id}`);
}

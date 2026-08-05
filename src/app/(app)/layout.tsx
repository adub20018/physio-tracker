// Layout for every authenticated route — adds the top nav. proxy.ts's middleware
// guarantees a session here (see PLAN.md §5); also mounts EnsureTimezoneCookie for "today".
import { getCurrentUser } from "@/auth/get-current-user";
import { AppNav } from "@/components/ui/nav/app-nav";
import { EnsureTimezoneCookie } from "@/components/ui/shared/ensure-timezone-cookie";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <>
      <EnsureTimezoneCookie />
      <AppNav user={{ name: user.name, email: user.email }} />
      {children}
    </>
  );
}

// Layout for every authenticated route (dashboard, /log, /insights,
// /history) — adds the top nav with the account menu on top of the root
// layout's shell. Every route under this group is already gated by
// proxy.ts's middleware, so getCurrentUser() here is guaranteed a real
// session; no null-handling needed (see PLAN.md §5).
import { getCurrentUser } from "@/auth/get-current-user";
import { AppNav } from "@/components/ui/app-nav";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <>
      <AppNav user={{ name: user.name, email: user.email }} />
      {children}
    </>
  );
}

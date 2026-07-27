// /account/profile — your name and email. No repository or server action
// here: Better Auth's own client exposes updateUser() as a core endpoint,
// so this talks to it directly (this isn't app data, PLAN.md §5's
// repository rule doesn't apply).
import { getCurrentUser } from "@/auth/get-current-user";
import { EditProfileForm } from "@/components/ui/edit-profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  return (
    <main className="page" style={{ maxWidth: "30rem" }}>
      <header className="page-header">
        <h1>Profile</h1>
        <p className="subtitle">Your name and email on this account.</p>
      </header>
      <EditProfileForm initialName={user.name} email={user.email} />
    </main>
  );
}

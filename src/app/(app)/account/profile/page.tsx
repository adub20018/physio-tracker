// /account/profile — your name and email. No repository here: Better
// Auth's client exposes updateUser() directly, since this isn't app data.
import { getCurrentUser } from "@/auth/get-current-user";
import { EditProfileForm } from "@/components/ui/account/edit-profile-form";

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

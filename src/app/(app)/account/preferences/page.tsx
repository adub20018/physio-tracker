// /account/preferences — "App Settings" (the flare pain threshold) today,
// with room for more configurable settings as they're added.
import { getCurrentUser } from "@/auth/get-current-user";
import { userSettingsRepository } from "@/repositories";
import { AppConfigForm } from "@/components/ui/app-config-form";

export const dynamic = "force-dynamic";

export default async function PreferencesPage() {
  const user = await getCurrentUser();
  const settings = await userSettingsRepository.get(user.id);

  return (
    <main className="page" style={{ maxWidth: "30rem" }}>
      <header className="page-header">
        <h1>Preferences</h1>
        <p className="subtitle">Adjust configurable app settings.</p>
      </header>
      <AppConfigForm initialFlareThreshold={settings.flareThreshold} />
      <p
        style={{
          color: "var(--muted)",
          fontSize: "0.85rem",
          marginTop: "1rem",
          textAlign: "center",
        }}
      >
        More preferences will appear here as they&apos;re added.
      </p>
    </main>
  );
}

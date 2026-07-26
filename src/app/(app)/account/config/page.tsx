// /account/config — "App config": settings that used to be hardcoded
// constants, starting with the flare pain threshold. Written to be easy to
// extend with more fields as more configurable settings are added.
import { getCurrentUser } from "@/auth/get-current-user";
import { userSettingsRepository } from "@/repositories";
import { AppConfigForm } from "@/components/ui/app-config-form";

export const dynamic = "force-dynamic";

export default async function AppConfigPage() {
  const user = await getCurrentUser();
  const settings = await userSettingsRepository.get(user.id);

  return (
    <main className="page" style={{ maxWidth: "30rem" }}>
      <header className="page-header">
        <h1>App config</h1>
        <p className="subtitle">Adjust configurable app settings.</p>
      </header>
      <AppConfigForm initialFlareThreshold={settings.flareThreshold} />
    </main>
  );
}

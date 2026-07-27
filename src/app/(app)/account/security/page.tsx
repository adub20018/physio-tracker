// /account/security — shown as "Account" in the nav: login-related settings
// (password change) and the Danger Zone (account deletion). Account
// deletion itself is disabled: Neon's Managed Better Auth doesn't yet
// support self-service account deletion (confirmed via their docs — the
// User management guide lists it as a topic but doesn't cover it, matching
// the 404 the self-service deleteUser() call actually returns). The
// alternative, Neon's Management API, needs a project-admin API key this
// app doesn't have configured — revisit once Neon ships self-service
// deletion, or if that key gets added later.
import { Button } from "@primereact/ui/button";
import { ChangePasswordForm } from "@/components/ui/account/change-password-form";
import styles from "./security.module.css";

export default function AccountSecurityPage() {
  return (
    <main className="page" style={{ maxWidth: "36rem" }}>
      <header className="page-header">
        <h1>Account</h1>
        <p className="subtitle">Login and account-level settings.</p>
      </header>

      <div className={styles.sections}>
        <section>
          <h2 className={styles.cardTitle} style={{ marginBottom: "0.75rem" }}>
            Change password
          </h2>
          <ChangePasswordForm />
        </section>

        {/* <section className={styles.dangerCard}>
          <h2 className={styles.dangerTitle}>Danger zone</h2>
          <div className={styles.row}>
            <div className={styles.rowText}>
              <span className={styles.rowLabel}>Delete account</span>
              <span className={styles.rowHint}>
                Not available yet — see Data → Delete data to erase your
                logged data in the meantime.
              </span>
            </div>
            <Button disabled severity="danger">
              Delete account
            </Button>
          </div>
        </section> */}
      </div>
    </main>
  );
}

// Account page (nav label "Account"): password change + Danger Zone.
// Deletion is disabled — Neon's Managed Better Auth has no self-service delete yet (404s).
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

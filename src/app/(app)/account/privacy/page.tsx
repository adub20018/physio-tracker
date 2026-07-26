// /account/privacy — plain-language explanation of what's stored and how to
// request deletion. Static server component, no form: this is informational
// content, not a formal legal policy document.
import styles from "./privacy.module.css";

export default function PrivacyPage() {
  return (
    <main className="page" style={{ maxWidth: "36rem" }}>
      <header className="page-header">
        <h1>Privacy</h1>
        <p className="subtitle">What&apos;s stored, and how to have it removed.</p>
      </header>

      <div className={styles.sections}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>What&apos;s stored</h2>
          <ul className={styles.list}>
            <li>
              <strong>Account info</strong> — your name, email address, and a
              securely hashed password, managed by Neon Auth.
            </li>
            <li>
              <strong>Daily logs</strong> — pain readings, step counts, sleep
              hours, activity notes, and physio exercise details, each tied to
              your account only.
            </li>
            <li>
              <strong>App settings</strong> — preferences like your flare pain
              threshold (Account → App config).
            </li>
          </ul>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Where it lives</h2>
          <p>
            Everything above is stored in this app&apos;s Postgres database
            (hosted on Neon) and is only ever read to render your own pages —
            it isn&apos;t shared with, or sold to, anyone else, and there are
            no analytics or ad trackers in this app.
          </p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Requesting deletion</h2>
          <p>
            There isn&apos;t a self-serve &quot;delete account&quot; button
            yet. Until there is, contact whoever manages this app&apos;s
            deployment and ask for your account and logged data to be
            deleted — it can be removed entirely, not just deactivated.
          </p>
        </section>
      </div>
    </main>
  );
}

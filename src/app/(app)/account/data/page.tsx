// /account/data — what's stored, plus exporting or deleting it. Static
// server component apart from export (download link) and delete (client).
import { Button } from "@primereact/ui/button";
import { DeleteDataButton } from "@/components/ui/account/delete-data-button";
import styles from "./data.module.css";

export default function DataPage() {
  return (
    <main className="page" style={{ maxWidth: "36rem" }}>
      <header className="page-header">
        <h1>Data</h1>
        <p className="subtitle">What&apos;s stored, and how to export or remove it.</p>
      </header>

      <div className={styles.sections}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>What&apos;s stored</h2>
          <ul className={styles.list}>
            <li>
              <strong>Daily logs</strong> — pain readings, step counts, sleep
              hours, activity notes, and physio exercise details, tied to
              your account only.
            </li>
            <li>
              <strong>App settings</strong> — preferences like your flare
              pain threshold (Account → Preferences).
            </li>
          </ul>
          <p>
            Everything above is stored in this app&apos;s Postgres database
            (hosted on Neon) and is only ever read to render your own pages —
            it isn&apos;t shared with, or sold to, anyone else, and there are
            no analytics or ad trackers in this app.
          </p>
        </section>

        <section className={styles.card}>
          <div className={styles.row}>
            <div className={styles.rowText}>
              <span className={styles.rowLabel}>Export CSV</span>
              <span className={styles.rowHint}>
                Download every logged day as a CSV file.
              </span>
            </div>
            {/* Plain anchor composed as a Button: a download must be a real
                navigation, not a client route. */}
            <Button as="a" href="/history/export" download severity="secondary" variant="outlined">
              Export CSV
            </Button>
          </div>
          <div className={styles.row}>
            <div className={styles.rowText}>
              <span className={styles.rowLabel}>Delete data</span>
              <span className={styles.rowHint}>
                Erase every logged day, exercise, and app setting. Your
                account stays.
              </span>
            </div>
            <DeleteDataButton />
          </div>
        </section>
      </div>
    </main>
  );
}

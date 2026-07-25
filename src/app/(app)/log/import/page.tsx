// /log/import — upload a spreadsheet in the same format as PLAN.md §1's
// tracking sheet and import it into the signed-in user's own account.
// Replaces the old single-user CLI script (scripts/import-xlsx.ts) so
// anyone can bring their own history in, not just the original owner.
import Link from "next/link";
import { ChevronLeft } from "@primeicons/react/chevron-left";
import { XlsxImportForm } from "@/components/ui/xlsx-import-form";
import styles from "@/components/ui/log-section-header.module.css";

export default function ImportPage() {
  return (
    <main className="page" style={{ maxWidth: "36rem" }}>
      <div className={styles.header}>
        <Link href="/log" className={styles.backLink}>
          <ChevronLeft size={16} /> Log
        </Link>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Import from spreadsheet</h1>
        </div>
      </div>
      <p className="subtitle" style={{ marginBottom: "1rem" }}>
        Upload a .xlsx in the same format as the tracking spreadsheet (Date, Steps, Physio
        Exercise, Morning/Daytime/Night Pain, Physio Notes, Intensity, Activity Notes, General
        Notes). It imports into your own account only.
      </p>
      <XlsxImportForm />
    </main>
  );
}

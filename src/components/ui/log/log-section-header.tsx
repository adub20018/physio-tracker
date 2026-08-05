// Shared header for every /log section page and the review page. Date is
// display-only here; it's only ever changed from the overview.
import Link from "next/link";
import { ChevronLeft } from "@primeicons/react/chevron-left";
import { shortDateLabel } from "@/lib/format";
import styles from "./log-section-header.module.css";

export function LogSectionHeader({ title, date }: { title: string; date: string }) {
  return (
    <div className={styles.header}>
      <Link href={`/log?date=${date}`} className={styles.backLink}>
        <ChevronLeft size={16} /> Log
      </Link>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{title}</h1>
        <span className={styles.date}>{shortDateLabel(date)}</span>
      </div>
    </div>
  );
}

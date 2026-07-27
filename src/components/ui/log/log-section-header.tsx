// Shared header for every /log section page (Pain, Activity, Physio,
// Notes) and the review page: a link back to the overview, the section
// title, and the active date shown as a plain label — the date itself is
// only ever changed from the overview (PLAN.md-style single source of
// truth for "which day am I working on").
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

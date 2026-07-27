// The one place the active log date is changeable — the overview page.
// Every section page and the review page just display this same date as a
// plain label (LogSectionHeader) and navigate with it in the URL.
"use client";

import { useRouter } from "next/navigation";
import { LogDatePicker } from "./log-fields";
import styles from "./log-shared.module.css";

export function LogDateBar({ date }: { date: string }) {
  const router = useRouter();

  function changeDate(newDate: string) {
    if (newDate && newDate !== date) router.push(`/log?date=${newDate}`);
  }

  return (
    <div className={styles.dateBar}>
      <LogDatePicker date={date} onChange={changeDate} />
    </div>
  );
}

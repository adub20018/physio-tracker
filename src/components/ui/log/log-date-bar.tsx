// The one place the active log date is changeable. Owns pending state via useTransition instead
// of loading.tsx, since a searchParam-only nav on the same route keeps stale Suspense content instead of reverting to the fallback.
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogDatePicker } from "./log-fields";
import { LogTilesSkeleton } from "./log-tiles-skeleton";
import styles from "./log-shared.module.css";

export function LogDateBar({
  date,
  children,
}: {
  date: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function changeDate(newDate: string) {
    if (newDate && newDate !== date) {
      startTransition(() => {
        router.push(`/log?date=${newDate}`);
      });
    }
  }

  return (
    <>
      <div className={styles.dateBar}>
        <LogDatePicker date={date} onChange={changeDate} />
      </div>
      {isPending ? <LogTilesSkeleton /> : children}
    </>
  );
}

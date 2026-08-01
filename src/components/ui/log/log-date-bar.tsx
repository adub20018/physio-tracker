// The one place the active log date is changeable — the overview page.
// Every section page and the review page just display this same date as a
// plain label (LogSectionHeader) and navigate with it in the URL.
//
// Also owns the pending state for that date change and swaps `children`
// (the server-rendered tiles for the *previous* date) for a skeleton while
// the new date's page is loading. This can't be left to the route's own
// loading.tsx: changing the date is a searchParam-only navigation on the
// same route, and Next's router wraps navigations in a React transition —
// once a Suspense boundary has already shown real content, React keeps
// showing that (now-stale) content through a transition instead of
// reverting to the fallback, which is exactly why the page looked frozen
// for however long the new date took to load. Owning `isPending` here (via
// useTransition, wrapping the same router.push already used) is the
// documented way to get an explicit pending UI for exactly this case.
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

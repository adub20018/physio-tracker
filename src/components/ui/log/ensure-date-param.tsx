// Every /log page resolves its active date server-side via
// lib/dates.ts's resolveDateParam, which falls back to the SERVER's local
// "today" when the URL has no ?date=. That's the app's process clock — on
// Vercel that's UTC, not wherever the visitor actually is. For anyone not
// in UTC, there's a window each day (evening/night for zones ahead of UTC)
// where the server's "today" is a calendar day off from the visitor's own.
// Mounted on every date-driven /log page, this corrects that once: if the
// URL is missing ?date=, it replaces the URL with the BROWSER's own local
// date, which is always right regardless of where the server runs or where
// the visitor currently is. Renders nothing; the page's initial render
// briefly uses the server's (possibly wrong) default until this fires.
"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function browserTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function EnsureDateParam() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasDate = searchParams.has("date");

  useEffect(() => {
    if (hasDate) return;
    const params = new URLSearchParams(searchParams);
    params.set("date", browserTodayIso());
    router.replace(`${pathname}?${params.toString()}`);
    // Re-run only when the URL actually lacks a date — searchParams/router
    // are excluded since they're new identities every render regardless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDate, pathname]);

  return null;
}

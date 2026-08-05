// Syncs a `tz` cookie with the browser's IANA timezone so server components (lib/dates.ts's todayIso)
// compute "today" correctly; non-httpOnly since it's set from client JS. Mounted once in (app)/layout.tsx.
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const COOKIE_NAME = "tz";

function readCookie(name: string): string | undefined {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

export function EnsureTimezoneCookie() {
  const router = useRouter();

  useEffect(() => {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (readCookie(COOKIE_NAME) === browserTz) return;

    // 1 year, path=/: every request across the app should see it.
    document.cookie = `${COOKIE_NAME}=${browserTz}; path=/; max-age=31536000; SameSite=Lax`;
    // Refresh once so the current render picks up the corrected timezone immediately.
    router.refresh();
    // Runs once per session; a mid-session timezone change won't retrigger until reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

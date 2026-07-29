// Keeps a `tz` cookie in sync with the browser's own IANA timezone
// (Intl.DateTimeFormat().resolvedOptions().timeZone), so server components
// can compute "today" (lib/dates.ts's todayIso) in the visitor's actual
// timezone instead of the server PROCESS's own — UTC on Vercel, wherever
// that happens to be. A fixed TZ env var on the server was considered and
// rejected: it would still be wrong the moment this user logs from a
// different timezone (the whole point of logging "on the go"), where a
// per-visitor cookie keeps working automatically no matter where the
// server or the visitor are.
//
// A plain, non-httpOnly cookie, since it has to be set from client JS:
// Server Components can only READ cookies (see lib/dates.ts's own comment,
// and the discovery that cost real debugging time in the landing-page
// work — auth.getSession() throwing "Cookies can only be modified in a
// Server Action or Route Handler" when called from a plain page). This
// needs to reflect whichever actual browser is rendering the page, not a
// value the server could decide on its own.
//
// Mounted once in (app)/layout.tsx, covering every authenticated page —
// this superseded the earlier /log-only fix (a client-side redirect that
// injected the browser's date into the URL, EnsureDateParam), since that
// approach only made sense for pages with a ?date= param to correct;
// /dashboard and /insights have no such param and were still silently
// wrong. Fixing "today" at the source here covers all of them uniformly.
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
    // Whatever page this mounted on already computed "today" from the
    // server's own clock (or a stale cookie) for its current render —
    // refresh once so the very next render picks up the corrected
    // timezone immediately, instead of waiting for whatever the visitor
    // navigates to next.
    router.refresh();
    // Runs once per app session (this layout doesn't remount on
    // client-side navigation) — a mid-session timezone change (e.g.
    // crossing zones on a long flight, tab left open) won't retrigger
    // until the next full reload, which is an acceptable edge case here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

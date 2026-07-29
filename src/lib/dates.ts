// Small date helpers that depend on the environment clock (unlike domain/,
// which stays pure). Shared by pages so "today" is defined in exactly one
// place.
import { cookies } from "next/headers";

// Kept in sync with the browser's own IANA timezone by
// components/ui/shared/ensure-timezone-cookie.tsx, mounted once in
// (app)/layout.tsx. Read here so "today" reflects wherever the visitor
// actually is — see that component's own comment for why a per-visitor
// cookie is used instead of a fixed TZ env var on the server.
const TIMEZONE_COOKIE = "tz";

// Today's date, in the visitor's own timezone when known (via the `tz`
// cookie), falling back to the SERVER's local timezone (UTC on Vercel)
// otherwise. That fallback only ever applies on a visitor's very first-ever
// request, before EnsureTimezoneCookie has had a chance to set the cookie
// and refresh — every request after that uses the real one.
export async function todayIso(): Promise<string> {
  const cookieStore = await cookies();
  const tz = cookieStore.get(TIMEZONE_COOKIE)?.value;
  const now = new Date();

  if (tz) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(now);
      const y = parts.find((p) => p.type === "year")!.value;
      const m = parts.find((p) => p.type === "month")!.value;
      const d = parts.find((p) => p.type === "day")!.value;
      return `${y}-${m}-${d}`;
    } catch {
      // Malformed/unrecognized zone name — Intl throws a RangeError.
      // Shouldn't happen (the client always sends a real Intl-resolved
      // zone), but fall through to the server-clock default rather than
      // 500ing the page over a stray cookie value.
    }
  }

  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// The log flow's one shared rule for "which date is active": a valid
// ?date= query param, or today. Every /log page (overview, each section,
// review) resolves it the same way so the active date is exactly what's
// in the URL — no separate client-side date state to fall out of sync.
export async function resolveDateParam(dateParam: string | undefined): Promise<string> {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateParam ?? "") ? dateParam! : await todayIso();
}

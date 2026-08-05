// Small date helpers that depend on the environment clock (unlike domain/, which stays
// pure). Shared by pages so "today" is defined in exactly one place.
import { cookies } from "next/headers";

// Kept in sync with the browser's IANA timezone by ensure-timezone-cookie.tsx (mounted in
// (app)/layout.tsx), so "today" reflects wherever the visitor actually is.
const TIMEZONE_COOKIE = "tz";

// Today's date in the visitor's timezone (via the `tz` cookie), falling back to the server's
// local timezone — only on a visitor's very first request, before the cookie is set.
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
      // Malformed/unrecognized zone name (Intl throws RangeError) — shouldn't happen, but
      // fall through to the server-clock default rather than 500ing over a stray cookie value.
    }
  }

  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// The log flow's one shared rule for "which date is active": a valid ?date= query param,
// or today. Every /log page resolves it the same way so it can't fall out of sync with the URL.
export async function resolveDateParam(dateParam: string | undefined): Promise<string> {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateParam ?? "") ? dateParam! : await todayIso();
}

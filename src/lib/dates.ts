// Small date helpers that depend on the environment clock (unlike domain/,
// which stays pure). Shared by pages so "today" is defined in exactly one
// place.

// Today's date in the SERVER's local timezone (UTC on Vercel) — only ever
// used as resolveDateParam's fallback for the very first render of a /log
// page with no ?date= yet, before EnsureDateParam (see
// components/ui/log/ensure-date-param.tsx) corrects the URL to the
// visitor's own local date. Deliberately not "fixed" to a fixed timezone
// here: a single hardcoded TZ would still be wrong the moment this user
// logs from a different one, which the client-side correction handles
// automatically regardless of where the server or the visitor are.
export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// The log flow's one shared rule for "which date is active": a valid
// ?date= query param, or today. Every /log page (overview, each section,
// review) resolves it the same way so the active date is exactly what's
// in the URL — no separate client-side date state to fall out of sync.
export function resolveDateParam(dateParam: string | undefined): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateParam ?? "") ? dateParam! : todayIso();
}

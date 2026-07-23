// Small date helpers that depend on the environment clock (unlike domain/,
// which stays pure). Shared by pages so "today" is defined in exactly one
// place.

// Today's date in the server's local timezone. Fine for local use; when
// deployed (Phase 5), set the TZ env var on Vercel to the user's timezone so
// "today" doesn't flip over at UTC midnight.
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

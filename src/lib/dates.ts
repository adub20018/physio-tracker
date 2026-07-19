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

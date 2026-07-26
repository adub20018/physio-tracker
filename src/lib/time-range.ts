// Shared time-range presets for the dashboard and insights pages — a
// per-page selection (via the `range` URL search param) that drives both
// the stat-tile comparison window and how far back each chart's data goes.
// Not domain/: this is a presentation-layer concept (which preset is
// selected), not a rehab calculation.

export const TIME_RANGES = ["7d", "1m", "3m", "1y", "all"] as const;
export type TimeRange = (typeof TIME_RANGES)[number];

export const DEFAULT_TIME_RANGE: TimeRange = "7d";

export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  "7d": "7D",
  "1m": "1M",
  "3m": "3M",
  "1y": "1Y",
  all: "All",
};

// Calendar-day counts, not exact months/years — consistent with the rest of
// the domain layer's calendar-window math (e.g. filterWindow). "all" is
// Infinity, not a real day count: filterWindow's `diff < nDays` check is
// then true for every day on or before `end`, i.e. no lower bound at all —
// and it composes cleanly with windowComparison's "previous period" window
// (nDays * 2 stays Infinity, and subtracting the current days from it
// leaves nothing, so `previous` naturally comes back empty instead of
// needing special-casing).
const TIME_RANGE_DAYS: Record<TimeRange, number> = {
  "7d": 7,
  "1m": 30,
  "3m": 90,
  "1y": 365,
  all: Infinity,
};

export function daysForRange(range: TimeRange): number {
  return TIME_RANGE_DAYS[range];
}

// Full prepositional phrase for stat-tile hints ("Average of ... over the
// last 3 months."). A separate phrase per range rather than a bare
// duration ("3 months") slotted into one fixed "over the last ___"
// template, because "all" doesn't fit that template grammatically — it
// needs its own preposition ("across all logged history", not "over the
// last all logged history").
export const TIME_RANGE_HINT_PHRASES: Record<TimeRange, string> = {
  "7d": "over the last 7 days",
  "1m": "over the last month",
  "3m": "over the last 3 months",
  "1y": "over the last year",
  all: "across all logged history",
};

// Phrasing for the stat-tile delta line ("+0.4 vs previous month"), since
// the comparison period now matches whatever range is selected, not always
// "last week". Unused for "all" — there's no "previous all-time" period, so
// windowComparison's `previous` window is always empty and the delta simply
// doesn't render (StatTile hides it when delta is null).
export const TIME_RANGE_COMPARISON_LABELS: Record<TimeRange, string> = {
  "7d": "vs previous week",
  "1m": "vs previous month",
  "3m": "vs previous 3 months",
  "1y": "vs previous year",
  all: "vs previous period",
};

// Narrows an arbitrary search-param value to a valid TimeRange, falling
// back to the default for anything missing or unrecognized (e.g. a
// hand-edited or stale URL).
export function parseTimeRange(value: string | undefined): TimeRange {
  return (TIME_RANGES as readonly string[]).includes(value ?? "")
    ? (value as TimeRange)
    : DEFAULT_TIME_RANGE;
}

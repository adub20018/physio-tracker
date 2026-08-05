// Shared time-range presets for the dashboard and insights pages (via the `range` URL
// param). Not domain/: this is a presentation-layer concept, not a rehab calculation.

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

// Calendar-day counts matching filterWindow's math. "all" is Infinity so its bound check
// passes for every day and windowComparison's "previous period" comes back empty for free.
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

// Full prepositional phrase for stat-tile hints ("Average of ... over the last 3 months.").
// A phrase per range, not one template, since "all" needs its own preposition.
export const TIME_RANGE_HINT_PHRASES: Record<TimeRange, string> = {
  "7d": "over the last 7 days",
  "1m": "over the last month",
  "3m": "over the last 3 months",
  "1y": "over the last year",
  all: "across all logged history",
};

// Phrasing for the stat-tile delta line ("+0.4 vs previous month"). Unused for "all" —
// windowComparison's `previous` is always empty then, so StatTile hides the delta.
export const TIME_RANGE_COMPARISON_LABELS: Record<TimeRange, string> = {
  "7d": "vs previous week",
  "1m": "vs previous month",
  "3m": "vs previous 3 months",
  "1y": "vs previous year",
  all: "vs previous period",
};

// Narrows an arbitrary search-param value to a valid TimeRange, falling back to the
// default for anything missing or unrecognized (e.g. a hand-edited or stale URL).
export function parseTimeRange(value: string | undefined): TimeRange {
  return (TIME_RANGES as readonly string[]).includes(value ?? "")
    ? (value as TimeRange)
    : DEFAULT_TIME_RANGE;
}

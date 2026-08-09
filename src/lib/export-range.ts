// Time-range options for the CSV export dialog. Deliberately separate from
// lib/time-range.ts's TimeRange (dashboard charts): this needs 14d and a
// custom from/to range, neither of which fit that enum.

export const EXPORT_RANGES = ["all", "7d", "14d", "30d", "3m", "custom"] as const;
export type ExportRangeOption = (typeof EXPORT_RANGES)[number];

export const EXPORT_RANGE_LABELS: Record<ExportRangeOption, string> = {
  all: "All time",
  "7d": "Last 7 days",
  "14d": "Last 14 days",
  "30d": "Last 30 days",
  "3m": "Last 3 months",
  custom: "Custom range...",
};

const EXPORT_RANGE_DAYS: Partial<Record<ExportRangeOption, number>> = {
  "7d": 7,
  "14d": 14,
  "30d": 30,
  "3m": 90,
};

// null for "all" (no window) and "custom" (uses explicit from/to instead).
export function daysForExportRange(range: ExportRangeOption): number | null {
  return EXPORT_RANGE_DAYS[range] ?? null;
}

export function parseExportRange(value: string | null): ExportRangeOption {
  return (EXPORT_RANGES as readonly string[]).includes(value ?? "")
    ? (value as ExportRangeOption)
    : "all";
}

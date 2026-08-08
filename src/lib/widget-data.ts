// Display-ready data for the two report widgets (Flare review, Weekly report card),
// plus the shared chart series. Deliberately outside domain/dashboard-bundle.ts: the
// flare review needs raw-log fields — notes, activity tags, exercise names — that
// DomainDay drops, and both need lib/format helpers domain/ may not import.
import type { DailyLogWithExercises } from "@/repositories";
import type { DomainDay } from "@/domain/types";
import {
  buildChartDataBundle,
  type ChartDataBundle,
} from "@/domain/dashboard-bundle";
import { flareEpisodes } from "@/domain/flare";
import { weeklyReport } from "@/domain/weekly";
import { summarizeExercises, weekdayOf } from "@/lib/format";

// How many days before a flare the review looks back.
export const FLARE_LOOKBACK_DAYS = 3;

// Only the log fields the flare review actually reads. Narrower than the full
// repository row so the Add-widget picker can build mock rows without
// inventing every DB column; real callers pass their logs straight through.
export type FlareLogFields = Pick<
  DailyLogWithExercises,
  "date" | "generalNotes" | "activityTags" | "exercises"
>;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// "Jul 13 – Jul 19" from two ISO dates.
function weekLabel(startIso: string, endIso: string): string {
  const fmt = (iso: string) => {
    const [, m, d] = iso.split("-").map(Number);
    return `${MONTHS[m - 1]} ${d}`;
  };
  return `${fmt(startIso)} – ${fmt(endIso)}`;
}

// One pain reading that crossed the flare threshold.
export type FlareReading = {
  slot: "Morning" | "Daytime" | "Night";
  value: number;
};

// One preceding day, preformatted for display.
export type FlareContextDay = {
  date: string;
  weekday: string;
  steps: number | null;
  physioSummary: string; // "" when rest day
  activityTags: string[];
  notes: string;
};

export type FlareEpisodeView = {
  date: string;
  weekday: string;
  readings: FlareReading[];
  notes: string;
  precedingDays: FlareContextDay[];
};

export type WeeklyRow = {
  weekStart: string;
  weekLabel: string; // "Jul 13 – Jul 19"
  loggedDays: number;
  painAvg: number | null;
  painDelta: string | null; // "+0.4" / "−0.2" vs previous week
  painImproved: boolean | null;
  stepsAvg: number | null;
  physioLoad: number;
  flareDays: number;
};

// Everything a dashboard widget can render: the shared chart series plus the
// two report views.
export type WidgetDataBundle = ChartDataBundle & {
  flareEpisodeViews: FlareEpisodeView[];
  weeklyRows: WeeklyRow[];
};

export function buildFlareEpisodeViews(
  days: DomainDay[],
  logs: FlareLogFields[],
  flareThreshold: number,
): FlareEpisodeView[] {
  const logByDate = new Map(logs.map((l) => [l.date, l]));

  return flareEpisodes(days, FLARE_LOOKBACK_DAYS, flareThreshold).map((ep) => {
    // The reading(s) that crossed the threshold, with explicit slot names.
    const readings = (
      [
        ["Morning", ep.day.painMorning],
        ["Daytime", ep.day.painDaytime],
        ["Night", ep.day.painNight],
      ] as const
    )
      .filter((entry): entry is [(typeof entry)[0], number] => {
        const v = entry[1];
        return v != null && v >= flareThreshold;
      })
      .map(([slot, value]) => ({ slot, value }));

    return {
      date: ep.day.date,
      weekday: weekdayOf(ep.day.date),
      readings,
      notes: logByDate.get(ep.day.date)?.generalNotes ?? "",
      precedingDays: ep.precedingDays.map((d) => {
        const log = logByDate.get(d.date);
        return {
          date: d.date,
          weekday: weekdayOf(d.date),
          steps: d.steps,
          physioSummary: log ? summarizeExercises(log) : "",
          activityTags: log?.activityTags ?? [],
          notes: log?.generalNotes ?? "",
        };
      }),
    };
  });
}

// Weekly summaries with week-over-week pain deltas.
export function buildWeeklyRows(
  days: DomainDay[],
  flareThreshold: number,
): WeeklyRow[] {
  const weeks = weeklyReport(days, flareThreshold);

  return weeks.map((w, i) => {
    const prev = i > 0 ? weeks[i - 1] : null;
    const delta =
      w.painAvg != null && prev?.painAvg != null
        ? w.painAvg - prev.painAvg
        : null;
    return {
      weekStart: w.weekStart,
      weekLabel: weekLabel(w.weekStart, w.weekEnd),
      loggedDays: w.loggedDays,
      painAvg: w.painAvg,
      painDelta:
        delta != null
          ? `${delta < 0 ? "−" : "+"}${Math.abs(delta).toFixed(1)}`
          : null,
      painImproved: delta != null ? delta <= 0 : null,
      stepsAvg: w.stepsAvg,
      physioLoad: w.physioLoad,
      flareDays: w.flareDays,
    };
  });
}

export function buildWidgetDataBundle(
  logs: FlareLogFields[],
  days: DomainDay[],
  today: string,
  flareThreshold: number,
): WidgetDataBundle {
  return {
    ...buildChartDataBundle(days, today, flareThreshold),
    flareEpisodeViews: buildFlareEpisodeViews(days, logs, flareThreshold),
    weeklyRows: buildWeeklyRows(days, flareThreshold),
  };
}

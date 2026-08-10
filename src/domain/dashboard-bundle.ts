// Computes every series a dashboard chart could need from shared `days`/`today`/
// `flareThreshold` inputs. Flare review and the Weekly report card need raw-log fields
// DomainDay drops, so they're built in lib/widget-data.ts instead — see the note there.
import type { DomainDay } from "./types";
import {
  dailyPainAverage,
  dailyPainPeak,
  lastNDaysSeries,
  windowComparison,
  type DatedValue,
} from "./aggregate";
import { rollingAverage } from "./rolling";
import { dailyPhysioLoad } from "./load";
import { isFlareDay, daysSinceLastFlare } from "./flare";
import {
  addDays,
  nextDayValue,
  nextMorningPain,
  nextDaytimePain,
  nextNightPain,
} from "./lag";
import { dailyPainCandles, type PainCandle } from "./candle";
import { pairSeries, type PairedPoint } from "./correlation";
import { ewmaWorkloadSeries, latestRatio, workloadSeries } from "./workload";

// Stat tiles always use a fixed 7-day window, independent of any chart widget's range —
// averaging a "how am I doing right now" tile over months would smear in stale, low numbers.
const STAT_WINDOW_DAYS = 7;

export type SparklinePoint = DatedValue<number> & { display: string };

export type StatWindowValues = {
  painAvg: number | null;
  stepsAvg: number | null;
  sleepAvg: number | null;
  physioLoadAvg: number | null;
};

export type PainTimelinePoint = {
  date: string;
  morning: number | null;
  daytime: number | null;
  night: number | null;
  rollingAvg: number | null;
  flareValue: number | null;
};

export type LoadVsSymptomsPoint = {
  date: string;
  steps: number | null;
  physioLoad: number;
  nextMorningPain: number | null;
  nextDaytimePain: number | null;
  nextNightPain: number | null;
};

export type SleepPainPoint = {
  date: string;
  sleepHours: number | null;
  painMorning: number | null;
  painDaytime: number | null;
  painNight: number | null;
};

export type ProgressionPoint = {
  date: string;
  intensityMin: number | null;
  intensityMax: number | null;
  intensityMid: number | null;
  holdVolume: number;
  physioLoad: number;
};

export type HeatmapDay = { date: string; avgPain: number | null };

// Acute:chronic ratios for the two things being ramped at once. Null until there's
// enough logged history to have a baseline worth dividing by (see domain/workload.ts).
export type WorkloadPoint = {
  date: string;
  physioLoadRatio: number | null;
  stepsRatio: number | null;
};

// The same windows kept in the metric's own units, so the ratio's thresholds can be
// drawn as a moving corridor (zoneBoundsFor) instead of an abstract multiplier.
export type LoadZonePoint = {
  date: string;
  // That day's own total. Same units as the corridor, so it can be drawn against it —
  // but it isn't what the zones bound, which is the acute mean below.
  value: number | null;
  // 28-day mean — what the body is currently adapted to.
  baseline: number | null;
  // 7-day mean — the thing the zones actually bound.
  acute: number | null;
};

export type ChartDataBundle = {
  // Stat tiles: fixed 7-day window vs the 7 days before it.
  flareGap: number | null;
  statCurrent: StatWindowValues;
  statPrevious: StatWindowValues;
  painSparkline: SparklinePoint[];
  stepsSparkline: SparklinePoint[];
  sleepSparkline: SparklinePoint[];
  physioLoadSparkline: SparklinePoint[];

  // Dashboard charts: full history, range-filtered client-side by the widget.
  fullTimeline: PainTimelinePoint[];
  fullLoad: LoadVsSymptomsPoint[];
  fullSleepTimelineData: SleepPainPoint[];
  fullProgression: ProgressionPoint[];
  heatmap: HeatmapDay[];
  fullWorkload: WorkloadPoint[];
  // Same ratios with exponentially decaying means — see ewmaWorkloadSeries.
  fullWorkloadEwma: WorkloadPoint[];
  fullPhysioLoadZones: LoadZonePoint[];
  fullStepZones: LoadZonePoint[];
  // Latest qualifying ratio for each, for the stat tiles.
  workloadNow: { physioLoad: number | null; steps: number | null };

  // Insights scatters + candlestick: full history.
  fullStepsPoints: PairedPoint[];
  fullVolumePoints: PairedPoint[];
  fullStepsVsPeakPoints: PairedPoint[];
  fullStepsVsAveragePoints: PairedPoint[];
  fullVolumeVsPeakPoints: PairedPoint[];
  fullVolumeVsAveragePoints: PairedPoint[];
  fullPainCandles: PainCandle[];
  fullSleepVsMorning: PairedPoint[];
  fullSleepVsDaytime: PairedPoint[];
  fullSleepVsNight: PairedPoint[];
};

export function buildChartDataBundle(
  days: DomainDay[],
  today: string,
  flareThreshold: number,
): ChartDataBundle {
  // ── Stat tiles ──────────────────────────────────────────────────────────
  // Today is excluded (a partial day would bias averages); days-since-flare still counts from today.
  const statWindowEnd = addDays(today, -1);
  const { current, previous } = windowComparison(
    days,
    statWindowEnd,
    STAT_WINDOW_DAYS,
  );
  const flareGap = daysSinceLastFlare(days, today, flareThreshold);

  const statCurrent: StatWindowValues = {
    painAvg: current.painAvg,
    stepsAvg: current.stepsAvg,
    sleepAvg: current.sleepAvg,
    physioLoadAvg:
      current.loggedDays > 0 ? current.physioLoad / current.loggedDays : null,
  };
  const statPrevious: StatWindowValues = {
    painAvg: previous.painAvg,
    stepsAvg: previous.stepsAvg,
    sleepAvg: previous.sleepAvg,
    physioLoadAvg:
      previous.loggedDays > 0 ? previous.physioLoad / previous.loggedDays : null,
  };

  const painSparkline: SparklinePoint[] = lastNDaysSeries(
    days,
    statWindowEnd,
    STAT_WINDOW_DAYS,
    dailyPainAverage,
  ).map((d) => ({
    ...d,
    display: d.value != null ? `${d.value.toFixed(1)}/10 pain` : "Not logged",
  }));
  const stepsSparkline: SparklinePoint[] = lastNDaysSeries(
    days,
    statWindowEnd,
    STAT_WINDOW_DAYS,
    (d) => d.steps,
  ).map((d) => ({
    ...d,
    display:
      d.value != null
        ? `${Math.round(d.value).toLocaleString()} steps`
        : "Not logged",
  }));
  const sleepSparkline: SparklinePoint[] = lastNDaysSeries(
    days,
    statWindowEnd,
    STAT_WINDOW_DAYS,
    (d) => d.sleepHours,
  ).map((d) => ({
    ...d,
    display: d.value != null ? `${d.value.toFixed(1)} hrs sleep` : "Not logged",
  }));
  const physioLoadSparkline: SparklinePoint[] = lastNDaysSeries(
    days,
    statWindowEnd,
    STAT_WINDOW_DAYS,
    (d) => dailyPhysioLoad(d),
  ).map((d) => ({
    ...d,
    display:
      d.value != null
        ? `${Math.round(d.value).toLocaleString()} physio load`
        : "Not logged",
  }));

  // ── Pain timeline ───────────────────────────────────────────────────────
  const painAvgs = days.map(dailyPainAverage);
  const rolling = rollingAverage(painAvgs, 7);
  const fullTimeline: PainTimelinePoint[] = days.map((d, i) => {
    const readings = [d.painMorning, d.painDaytime, d.painNight].filter(
      (p): p is number => p != null,
    );
    return {
      date: d.date,
      morning: d.painMorning,
      daytime: d.painDaytime,
      night: d.painNight,
      rollingAvg: rolling[i] != null ? Number(rolling[i]!.toFixed(2)) : null,
      flareValue: isFlareDay(d, flareThreshold) ? Math.max(...readings) : null,
    };
  });

  // ── Load vs next-day symptoms ───────────────────────────────────────────
  const nextMorning = nextMorningPain(days);
  const nextDaytime = nextDaytimePain(days);
  const nextNight = nextNightPain(days);
  const fullLoad: LoadVsSymptomsPoint[] = days.map((d, i) => ({
    date: d.date,
    steps: d.steps,
    physioLoad: Number(dailyPhysioLoad(d).toFixed(1)),
    nextMorningPain: nextMorning[i],
    nextDaytimePain: nextDaytime[i],
    nextNightPain: nextNight[i],
  }));

  // ── Sleep & pain, same day (not lagged — sleep precedes all 3 readings) ─
  const fullSleepTimelineData: SleepPainPoint[] = days.map((d) => ({
    date: d.date,
    sleepHours: d.sleepHours,
    painMorning: d.painMorning,
    painDaytime: d.painDaytime,
    painNight: d.painNight,
  }));

  // ── Physio progression (physio days only) ──────────────────────────────
  const fullProgression: ProgressionPoint[] = days
    .filter((d) => d.exercises.length > 0)
    .map((d) => {
      const mins = d.exercises
        .map((e) => e.intensityMin)
        .filter((v): v is number => v != null);
      const maxs = d.exercises
        .map((e) => e.intensityMax)
        .filter((v): v is number => v != null);
      const min = mins.length > 0 ? Math.min(...mins) : null;
      const max = maxs.length > 0 ? Math.max(...maxs) : null;
      return {
        date: d.date,
        intensityMin: min,
        intensityMax: max,
        intensityMid: min != null && max != null ? (min + max) / 2 : null,
        holdVolume: d.exercises.reduce(
          (sum, e) => sum + e.sets * e.durationOrReps,
          0,
        ),
        physioLoad: Number(dailyPhysioLoad(d).toFixed(1)),
      };
    });

  // ── Calendar-dense series: every date present, unlogged days null ──────
  // The heatmap needs the gaps drawn; the workload ratios need array slots to
  // equal calendar days, or a "28-day" window would silently reach further
  // back whenever logging lapsed.
  const byDate = new Map(days.map((d) => [d.date, d]));
  const heatmap: HeatmapDay[] = [];
  const denseLoad: DatedValue<number>[] = [];
  const denseSteps: DatedValue<number>[] = [];
  if (days.length > 0) {
    for (let date = days[0].date; date <= today; date = addDays(date, 1)) {
      const day = byDate.get(date);
      heatmap.push({ date, avgPain: day ? dailyPainAverage(day) : null });
      denseLoad.push({ date, value: day ? dailyPhysioLoad(day) : null });
      denseSteps.push({ date, value: day ? day.steps : null });
    }
  }

  // ── Workload ratios: recent load vs the adapted-to baseline ────────────
  const physioWorkload = workloadSeries(denseLoad);
  const stepsWorkload = workloadSeries(denseSteps);
  const physioEwma = ewmaWorkloadSeries(denseLoad);
  const stepsEwma = ewmaWorkloadSeries(denseSteps);
  const toRatioPoints = (
    physio: (number | null)[],
    steps: (number | null)[],
  ): WorkloadPoint[] =>
    denseLoad.map((slot, i) => ({
      date: slot.date,
      physioLoadRatio: physio[i],
      stepsRatio: steps[i],
    }));
  const fullWorkload = toRatioPoints(physioWorkload.ratio, stepsWorkload.ratio);
  const fullWorkloadEwma = toRatioPoints(physioEwma.ratio, stepsEwma.ratio);
  // Takes its own dense series rather than closing over one: the daily value has to
  // come from the metric being charted, not just the dates they happen to share.
  const toZonePoints = (
    dense: DatedValue<number>[],
    w: typeof physioWorkload,
  ): LoadZonePoint[] =>
    dense.map((slot, i) => ({
      date: slot.date,
      value: slot.value,
      baseline: w.chronic[i],
      acute: w.chronic[i] != null ? w.acute[i] : null,
    }));
  const fullPhysioLoadZones = toZonePoints(denseLoad, physioWorkload);
  const fullStepZones = toZonePoints(denseSteps, stepsWorkload);
  const workloadNow = {
    physioLoad: latestRatio(physioWorkload.ratio),
    steps: latestRatio(stepsWorkload.ratio),
  };

  // ── Insights scatters ───────────────────────────────────────────────────
  const dates = days.map((d) => d.date);
  const nextMorningLabels = days.map((d) => `${d.date} → next morning`);
  const nextDayLabels = days.map((d) => `${d.date} → next day`);
  const nextPeakPain = nextDayValue(days, dailyPainPeak);
  const nextAveragePain = nextDayValue(days, dailyPainAverage);

  const fullStepsPoints = pairSeries(
    days.map((d) => d.steps),
    nextMorning,
    nextMorningLabels,
    dates,
  );
  const fullVolumePoints = pairSeries(
    days.map((d) => dailyPhysioLoad(d)),
    nextMorning,
    nextMorningLabels,
    dates,
  );
  const fullStepsVsPeakPoints = pairSeries(
    days.map((d) => d.steps),
    nextPeakPain,
    nextDayLabels,
    dates,
  );
  const fullStepsVsAveragePoints = pairSeries(
    days.map((d) => d.steps),
    nextAveragePain,
    nextDayLabels,
    dates,
  );
  const fullVolumeVsPeakPoints = pairSeries(
    days.map((d) => dailyPhysioLoad(d)),
    nextPeakPain,
    nextDayLabels,
    dates,
  );
  const fullVolumeVsAveragePoints = pairSeries(
    days.map((d) => dailyPhysioLoad(d)),
    nextAveragePain,
    nextDayLabels,
    dates,
  );

  // ── Morning-to-day pain candlestick ─────────────────────────────────────
  const fullPainCandles = dailyPainCandles(days);

  // ── Sleep vs pain, all day (same-day, not lagged) ──────────────────────
  const sleepHoursSeries = days.map((d) => d.sleepHours);
  const fullSleepVsMorning = pairSeries(
    sleepHoursSeries,
    days.map((d) => d.painMorning),
    dates,
    dates,
  );
  const fullSleepVsDaytime = pairSeries(
    sleepHoursSeries,
    days.map((d) => d.painDaytime),
    dates,
    dates,
  );
  const fullSleepVsNight = pairSeries(
    sleepHoursSeries,
    days.map((d) => d.painNight),
    dates,
    dates,
  );

  return {
    flareGap,
    statCurrent,
    statPrevious,
    painSparkline,
    stepsSparkline,
    sleepSparkline,
    physioLoadSparkline,
    fullTimeline,
    fullLoad,
    fullSleepTimelineData,
    fullProgression,
    heatmap,
    fullWorkload,
    fullWorkloadEwma,
    fullPhysioLoadZones,
    fullStepZones,
    workloadNow,
    fullStepsPoints,
    fullVolumePoints,
    fullStepsVsPeakPoints,
    fullStepsVsAveragePoints,
    fullVolumeVsPeakPoints,
    fullVolumeVsAveragePoints,
    fullPainCandles,
    fullSleepVsMorning,
    fullSleepVsDaytime,
    fullSleepVsNight,
  };
}

// /insights — the correlation explorer (PLAN.md §3): lag scatter plots with
// Pearson r, the flare-up review with its "days before" context, and the
// weekly report card. Server component: loads logs, computes everything
// with pure domain functions, and hands display-ready data to client
// components. The three correlation scatter sections render via
// <InsightsCharts>, a client component that owns the time-range picker's
// state and does its own (cheap, in-memory) filtering — Flare review and
// the Weekly report card are range-independent and render directly here.
// "Sleep & pain over time" moved to the dashboard.
import { getCurrentUser } from "@/auth/get-current-user";
import { dailyLogRepository, userSettingsRepository } from "@/repositories";
import { toDomainDays } from "@/lib/to-domain";
import { todayIso } from "@/lib/dates";
import { summarizeExercises, weekdayOf } from "@/lib/format";
import { nextMorningPain } from "@/domain/lag";
import { dailyPhysioLoad } from "@/domain/load";
import { flareEpisodes } from "@/domain/flare";
import { weeklyReport } from "@/domain/weekly";
import { pairSeries } from "@/domain/correlation";
import {
  FlareReview,
  type FlareEpisodeView,
} from "@/components/ui/insights/flare-review";
import {
  WeeklyReportTable,
  type WeeklyRow,
} from "@/components/ui/insights/weekly-report-table";
import { InsightsCharts } from "@/components/ui/insights/insights-charts";
import styles from "@/components/ui/dashboard/dashboard.module.css";

// Always render at request time — insights must reflect the latest logs.
export const dynamic = "force-dynamic";

// How many days before a flare the review panel looks back.
const FLARE_LOOKBACK_DAYS = 3;

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

export default async function InsightsPage() {
  const user = await getCurrentUser();
  const [logs, { flareThreshold, chartAutoScaleYAxis }] = await Promise.all([
    dailyLogRepository.listAll(user.id),
    userSettingsRepository.get(user.id),
  ]);
  const days = toDomainDays(logs);
  const logByDate = new Map(logs.map((l) => [l.date, l]));
  const today = await todayIso();

  // ── Lag scatters, full history (<InsightsCharts> slices to range) ─────
  const nextPain = nextMorningPain(days);
  const labels = days.map((d) => `${d.date} → next morning`);
  const dates = days.map((d) => d.date);
  const fullStepsPoints = pairSeries(
    days.map((d) => d.steps),
    nextPain,
    labels,
    dates,
  );
  const fullVolumePoints = pairSeries(
    // Rest days (volume 0) stay in: doing nothing is also a data point.
    days.map((d) => dailyPhysioLoad(d)),
    nextPain,
    labels,
    dates,
  );

  // ── Sleep vs pain, all three readings: SAME day, not lagged ────────────
  // Sleep hours logged on a date are the hours slept the night before
  // waking up that day — they already precede ALL of that day's readings,
  // unlike steps/physio load whose effect shows up the next morning. Sleep
  // may affect the whole day, not just the immediate waking reading, so
  // morning/daytime/night are each paired with the same night's sleep.
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

  // ── Flare review ──────────────────────────────────────────────────────
  const episodes: FlareEpisodeView[] = flareEpisodes(
    days,
    FLARE_LOOKBACK_DAYS,
    flareThreshold,
  ).map((ep) => {
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

  // ── Weekly report card with week-over-week pain deltas ────────────────
  const weeks = weeklyReport(days, flareThreshold);
  const weeklyRows: WeeklyRow[] = weeks.map((w, i) => {
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

  return (
    <main className="page" style={{ maxWidth: "64rem" }}>
      <header className="page-header">
        <h1>Insights</h1>
        <p className="subtitle">More detailed visualisations of progress.</p>
      </header>

      <InsightsCharts
        fullStepsPoints={fullStepsPoints}
        fullVolumePoints={fullVolumePoints}
        fullSleepVsMorning={fullSleepVsMorning}
        fullSleepVsDaytime={fullSleepVsDaytime}
        fullSleepVsNight={fullSleepVsNight}
        today={today}
        autoScaleYAxis={chartAutoScaleYAxis}
      />

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Flare review</h2>
        <p className={styles.cardSubtitle}>
          Every day a reading hit {flareThreshold}/10, with the{" "}
          {FLARE_LOOKBACK_DAYS} days leading up to it.
        </p>
        <FlareReview episodes={episodes} />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Weekly report card</h2>
        <p className={styles.cardSubtitle}>
          Averages per calendar week, newest first — click Week to flip the
          order.
        </p>
        <WeeklyReportTable rows={weeklyRows} flareThreshold={flareThreshold} />
      </section>
    </main>
  );
}

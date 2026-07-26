// /insights — the correlation explorer (PLAN.md §3): lag scatter plots with
// Pearson r, the flare-up review with its "days before" context, and the
// weekly report card. Server component: loads logs, computes everything with
// pure domain functions, and hands display-ready data to client components.
import { getCurrentUser } from "@/auth/get-current-user";
import { dailyLogRepository } from "@/repositories";
import { toDomainDays } from "@/lib/to-domain";
import { todayIso } from "@/lib/dates";
import { summarizeExercises, weekdayOf } from "@/lib/format";
import { daysForRange, parseTimeRange } from "@/lib/time-range";
import { nextMorningPain } from "@/domain/lag";
import { dailyPhysioVolume } from "@/domain/volume";
import { flareEpisodes } from "@/domain/flare";
import { weeklyReport } from "@/domain/weekly";
import { filterWindow } from "@/domain/aggregate";
import {
  correlationStrength,
  pairSeries,
  pearson,
  type PairedPoint,
} from "@/domain/correlation";
import { LagScatter } from "@/components/charts/lag-scatter";
import {
  MultiScatter,
  type ScatterSeries,
} from "@/components/charts/multi-scatter";
import {
  SleepPainTimeline,
  type SleepPainPoint,
} from "@/components/charts/sleep-pain-timeline";
import { SERIES } from "@/components/charts/chart-theme";
import {
  FlareReview,
  type FlareEpisodeView,
} from "@/components/ui/flare-review";
import {
  WeeklyReportTable,
  type WeeklyRow,
} from "@/components/ui/weekly-report-table";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { TimeRangeSelector } from "@/components/ui/time-range-selector";
import { FLARE_PAIN_THRESHOLD } from "@/domain/constants";
import styles from "../dashboard.module.css";

const PEARSON_R_HINT =
  "Pearson correlation coefficient: how tightly two things move together, from -1 (as one goes up the other reliably goes down) to +1 (both reliably rise together). 0 means no relationship. “Weak/moderate/strong” bucket |r| at 0.2, 0.4, and 0.7. With only a few dozen days, treat this as a hint worth watching, not a proven cause.";

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

// Header line for one scatter: "r = −0.21 · weak · 41 days".
function correlationLine(points: PairedPoint[]): string {
  const r = pearson(points);
  if (r == null) return `not enough paired days yet (${points.length})`;
  const sign = r < 0 ? "−" : "";
  return `r = ${sign}${Math.abs(r).toFixed(2)} · ${correlationStrength(r)} · ${points.length} days`;
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await getCurrentUser();
  const logs = await dailyLogRepository.listAll(user.id);
  const days = toDomainDays(logs);
  const logByDate = new Map(logs.map((l) => [l.date, l]));
  const today = todayIso();

  const { range: rangeParam } = await searchParams;
  const range = parseTimeRange(rangeParam);
  const rangeDays = daysForRange(range);
  // Only the graphs respect the selected range — Flare review and the
  // Weekly report card (below) deliberately keep showing full history.
  const inRange = <T extends { date: string }>(points: T[]) =>
    filterWindow(points, today, rangeDays);

  // ── Lag scatters: today's load vs tomorrow morning's pain ─────────────
  // nextMorningPain looks up the FOLLOWING day within the full `days`
  // array, so pairing has to run before range-filtering (see the same note
  // on the dashboard) — otherwise the last visible day in a narrowed range
  // would wrongly show no next-day pain.
  const nextPain = nextMorningPain(days);
  const labels = days.map((d) => `${d.date} → next morning`);
  const dates = days.map((d) => d.date);
  const stepsPoints = inRange(
    pairSeries(
      days.map((d) => d.steps),
      nextPain,
      labels,
      dates,
    ),
  );
  const volumePoints = inRange(
    pairSeries(
      // Rest days (volume 0) stay in: doing nothing is also a data point.
      days.map((d) => dailyPhysioVolume(d)),
      nextPain,
      labels,
      dates,
    ),
  );

  // ── Sleep vs pain, all three readings: SAME day, not lagged ────────────
  // Sleep hours logged on a date are the hours slept the night before
  // waking up that day — they already precede ALL of that day's readings,
  // unlike steps/physio load whose effect shows up the next morning. Sleep
  // may affect the whole day, not just the immediate waking reading, so
  // morning/daytime/night are each paired with the same night's sleep.
  const sleepHoursSeries = days.map((d) => d.sleepHours);
  const sleepVsMorning = inRange(
    pairSeries(
      sleepHoursSeries,
      days.map((d) => d.painMorning),
      dates,
      dates,
    ),
  );
  const sleepVsDaytime = inRange(
    pairSeries(
      sleepHoursSeries,
      days.map((d) => d.painDaytime),
      dates,
      dates,
    ),
  );
  const sleepVsNight = inRange(
    pairSeries(
      sleepHoursSeries,
      days.map((d) => d.painNight),
      dates,
      dates,
    ),
  );
  const sleepScatterSeries: ScatterSeries[] = [
    {
      key: "morning",
      label: "Morning",
      color: SERIES.morning,
      points: sleepVsMorning,
    },
    {
      key: "daytime",
      label: "Daytime",
      color: SERIES.daytime,
      points: sleepVsDaytime,
    },
    { key: "night", label: "Night", color: SERIES.night, points: sleepVsNight },
  ];
  const sleepTimelineData: SleepPainPoint[] = inRange(
    days.map((d) => ({
      date: d.date,
      sleepHours: d.sleepHours,
      painMorning: d.painMorning,
      painDaytime: d.painDaytime,
      painNight: d.painNight,
    })),
  );

  // ── Flare review ──────────────────────────────────────────────────────
  const episodes: FlareEpisodeView[] = flareEpisodes(
    days,
    FLARE_LOOKBACK_DAYS,
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
        return v != null && v >= FLARE_PAIN_THRESHOLD;
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
  const weeks = weeklyReport(days);
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
      physioVolume: w.physioVolume,
      flareDays: w.flareDays,
    };
  });

  return (
    <main className="page" style={{ maxWidth: "64rem" }}>
      <div className={styles.headerRow}>
        <header className="page-header">
          <h1>Insights</h1>
          <p className="subtitle">
            More detailed data visualisations. Correlations are suggestive, not
            proof — sanity-check surprises with your physio.
          </p>
        </header>
        <TimeRangeSelector />
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          Steps vs next-morning pain
          <InfoTooltip text={PEARSON_R_HINT} label="What does r mean?" />
        </h2>
        <p className={styles.cardSubtitle}>{correlationLine(stepsPoints)}</p>
        <LagScatter
          points={stepsPoints}
          xLabel="Steps"
          yLabel="Next-morning pain"
        />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          Physio load vs next-morning pain
          <InfoTooltip text={PEARSON_R_HINT} label="What does r mean?" />
        </h2>
        <p className={styles.cardSubtitle}>{correlationLine(volumePoints)}</p>
        <LagScatter
          points={volumePoints}
          xLabel="Physio load"
          yLabel="Next-morning pain"
        />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          Sleep vs pain, all day
          <InfoTooltip text={PEARSON_R_HINT} label="What does r mean?" />
        </h2>
        <p className={styles.cardSubtitle}>
          Same day, not lagged — sleep hours logged on a date are the hours
          slept the night before waking up that day, so they precede all three
          of that day&apos;s readings, not just the morning one.
        </p>
        <ul className={styles.rList}>
          <li style={{ color: SERIES.morning }}>
            Morning: {correlationLine(sleepVsMorning)}
          </li>
          <li style={{ color: SERIES.daytime }}>
            Daytime: {correlationLine(sleepVsDaytime)}
          </li>
          <li style={{ color: SERIES.night }}>
            Night: {correlationLine(sleepVsNight)}
          </li>
        </ul>
        <MultiScatter
          series={sleepScatterSeries}
          xLabel="Sleep (hours)"
          yLabel="Pain"
        />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Sleep &amp; pain over time</h2>
        <p className={styles.cardSubtitle}>
          The same relationship as an over-time view — sleep the night before,
          and how the whole next day felt.
        </p>
        <SleepPainTimeline data={sleepTimelineData} />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Flare review</h2>
        <p className={styles.cardSubtitle}>
          Every day a reading hit {FLARE_PAIN_THRESHOLD}/10, with the{" "}
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
        <WeeklyReportTable rows={weeklyRows} />
      </section>
    </main>
  );
}

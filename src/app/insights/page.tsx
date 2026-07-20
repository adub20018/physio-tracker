// /insights — the correlation explorer (PLAN.md §3): lag scatter plots with
// Pearson r, the flare-up review with its "days before" context, and the
// weekly report card. Server component: loads logs, computes everything with
// pure domain functions, and hands display-ready data to client components.
import { getCurrentUser } from "@/auth/get-current-user";
import { dailyLogRepository } from "@/repositories";
import { toDomainDays } from "@/lib/to-domain";
import { summarizeExercises, weekdayOf } from "@/lib/format";
import { nextMorningPain } from "@/domain/lag";
import { dailyPhysioVolume } from "@/domain/volume";
import { flareEpisodes } from "@/domain/flare";
import { weeklyReport } from "@/domain/weekly";
import {
  correlationStrength,
  pairSeries,
  pearson,
  type PairedPoint,
} from "@/domain/correlation";
import { LagScatter } from "@/components/charts/lag-scatter";
import { FlareReview, type FlareEpisodeView } from "@/components/ui/flare-review";
import { WeeklyReportTable, type WeeklyRow } from "@/components/ui/weekly-report-table";
import { FLARE_PAIN_THRESHOLD } from "@/domain/constants";
import styles from "../dashboard.module.css";

// Always render at request time — insights must reflect the latest logs.
export const dynamic = "force-dynamic";

// How many days before a flare the review panel looks back.
const FLARE_LOOKBACK_DAYS = 3;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

export default async function InsightsPage() {
  const user = await getCurrentUser();
  const logs = await dailyLogRepository.listAll(user.id);
  const days = toDomainDays(logs);
  const logByDate = new Map(logs.map((l) => [l.date, l]));

  // ── Lag scatters: today's load vs tomorrow morning's pain ─────────────
  const nextPain = nextMorningPain(days);
  const labels = days.map((d) => `${d.date} → next morning`);
  const stepsPoints = pairSeries(days.map((d) => d.steps), nextPain, labels);
  const volumePoints = pairSeries(
    // Rest days (volume 0) stay in: doing nothing is also a data point.
    days.map((d) => dailyPhysioVolume(d)),
    nextPain,
    labels
  );

  // ── Flare review ──────────────────────────────────────────────────────
  const episodes: FlareEpisodeView[] = flareEpisodes(days, FLARE_LOOKBACK_DAYS).map((ep) => {
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
      w.painAvg != null && prev?.painAvg != null ? w.painAvg - prev.painAvg : null;
    return {
      weekStart: w.weekStart,
      weekLabel: weekLabel(w.weekStart, w.weekEnd),
      loggedDays: w.loggedDays,
      painAvg: w.painAvg,
      painDelta:
        delta != null ? `${delta < 0 ? "−" : "+"}${Math.abs(delta).toFixed(1)}` : null,
      painImproved: delta != null ? delta <= 0 : null,
      stepsAvg: w.stepsAvg,
      physioVolume: w.physioVolume,
      flareDays: w.flareDays,
    };
  });

  return (
    <main className="page" style={{ maxWidth: "64rem" }}>
      <header className="page-header">
        <h1>Insights</h1>
        <p className="subtitle">
          Load vs response, flare context, and week-by-week progress. Correlations are
          suggestive, not proof — sanity-check surprises with your physio.
        </p>
      </header>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Steps vs next-morning pain</h2>
        <p className={styles.cardSubtitle}>{correlationLine(stepsPoints)}</p>
        <LagScatter points={stepsPoints} xLabel="Steps" yLabel="Next-morning pain" />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Physio volume vs next-morning pain</h2>
        <p className={styles.cardSubtitle}>{correlationLine(volumePoints)}</p>
        <LagScatter points={volumePoints} xLabel="Physio volume" yLabel="Next-morning pain" />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Flare review</h2>
        <p className={styles.cardSubtitle}>
          Every day a reading hit {FLARE_PAIN_THRESHOLD}/10, with the {FLARE_LOOKBACK_DAYS} days
          leading up to it.
        </p>
        <FlareReview episodes={episodes} />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Weekly report card</h2>
        <p className={styles.cardSubtitle}>
          Averages per calendar week, newest first — click Week to flip the order.
        </p>
        <WeeklyReportTable rows={weeklyRows} />
      </section>
    </main>
  );
}

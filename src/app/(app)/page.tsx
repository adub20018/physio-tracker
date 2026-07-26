// / — the dashboard (PLAN.md §3). Server component: loads all logs, maps
// them to domain shape, computes every derived series with the pure domain
// functions, and renders stat tiles + the calendar heatmap directly. The
// three range-dependent charts render via <DashboardCharts>, a client
// component that owns the time-range picker's state and does its own
// (cheap, in-memory) filtering — see dashboard-charts.tsx for why that's a
// client component instead of a searchParam this page reads.
import { getCurrentUser } from "@/auth/get-current-user";
import { dailyLogRepository, userSettingsRepository } from "@/repositories";
import { toDomainDays } from "@/lib/to-domain";
import { todayIso } from "@/lib/dates";
import {
  daysForRange,
  TIME_RANGE_COMPARISON_LABELS,
  TIME_RANGE_HINT_PHRASES,
} from "@/lib/time-range";
import { dailyPainAverage, windowComparison } from "@/domain/aggregate";
import { rollingAverage } from "@/domain/rolling";
import { dailyPhysioVolume } from "@/domain/volume";
import { daysSinceLastFlare, isFlareDay } from "@/domain/flare";
import {
  addDays,
  nextDaytimePain,
  nextMorningPain,
  nextNightPain,
} from "@/domain/lag";
import { StatTile } from "@/components/ui/stat-tile";
import { DashboardCharts } from "@/components/ui/dashboard-charts";
import type { PainTimelinePoint } from "@/components/charts/pain-timeline";
import type { LoadVsSymptomsPoint } from "@/components/charts/load-vs-symptoms";
import type { ProgressionPoint } from "@/components/charts/progression-chart";
import type { SleepPainPoint } from "@/components/charts/sleep-pain-timeline";
import {
  CalendarHeatmap,
  type HeatmapDay,
} from "@/components/charts/calendar-heatmap";
import styles from "@/components/ui/dashboard.module.css";

// Always render at request time — the dashboard must reflect today's log.
export const dynamic = "force-dynamic";

// Formats a numeric delta as "+0.4" / "−0.4"; null when either side is missing.
function fmtDelta(
  current: number | null,
  previous: number | null,
  decimals: number,
): string | null {
  if (current == null || previous == null) return null;
  const diff = current - previous;
  const text = Math.abs(diff).toFixed(decimals);
  return diff >= 0 ? `+${text}` : `−${text}`;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const [logs, { flareThreshold }] = await Promise.all([
    dailyLogRepository.listAll(user.id),
    userSettingsRepository.get(user.id),
  ]);
  const days = toDomainDays(logs);
  const today = todayIso();

  // ── Stat tiles: always the last 7 days, independent of the chart range
  // picked in <DashboardCharts> below ─────────────────────────────────────
  // A stat tile answers "how am I doing right now" — averaging that over
  // months smears an improving baseline together with early, low numbers
  // and answers a different question than the tile is for. Charts benefit
  // from a wide range (the shape of change over time is the point); tiles
  // don't, so they stay locked to a week regardless of what range the
  // charts below are showing. Today is excluded from the window: a
  // partially-logged day (morning pain entered, steps not yet known) would
  // bias the averages. Days-since-flare still counts from today — a flare
  // logged this morning must show immediately.
  const statWindowDays = daysForRange("7d");
  const statDeltaLabel = TIME_RANGE_COMPARISON_LABELS["7d"];
  const statRangePhrase = TIME_RANGE_HINT_PHRASES["7d"];
  const { current, previous } = windowComparison(
    days,
    addDays(today, -1),
    statWindowDays,
  );
  const flareGap = daysSinceLastFlare(days, today, flareThreshold);

  // WindowStats.physioVolume is a raw SUM over the window — meaningful for
  // the weekly report card (always a fixed 7-day week), but here the
  // window length varies with the selected range, so a sum mechanically
  // grows with a wider range regardless of whether load actually went up.
  // Divide by loggedDays for a range-stable daily rate, consistent with
  // painAvg/stepsAvg/sleepAvg, which are already per-day averages.
  const currentPhysioLoadAvg =
    current.loggedDays > 0 ? current.physioVolume / current.loggedDays : null;
  const previousPhysioLoadAvg =
    previous.loggedDays > 0
      ? previous.physioVolume / previous.loggedDays
      : null;

  // ── Pain timeline (full history — <DashboardCharts> slices to range) ──
  const painAvgs = days.map(dailyPainAverage);
  const rolling = rollingAverage(painAvgs, 7);
  const fullTimeline: PainTimelinePoint[] = days.map((d, i) => {
    // Flare dot sits at the day's WORST reading — the one that crossed the
    // threshold — so dots always appear at ≥ 3, matching the flare rule.
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

  // ── Load vs symptoms, full history (next-day pain, all three readings) ─
  const nextMorning = nextMorningPain(days);
  const nextDaytime = nextDaytimePain(days);
  const nextNight = nextNightPain(days);
  const fullLoad: LoadVsSymptomsPoint[] = days.map((d, i) => ({
    date: d.date,
    steps: d.steps,
    physioVolume: Number(dailyPhysioVolume(d).toFixed(1)),
    nextMorningPain: nextMorning[i],
    nextDaytimePain: nextDaytime[i],
    nextNightPain: nextNight[i],
  }));

  // ── Sleep & pain over time, full history (moved here from Insights) ────
  // Deliberately SAME-DAY, not lagged: sleep hours logged on a date are the
  // hours slept the night before waking up that day, so they already
  // precede that day's readings (unlike steps/physio load above, whose
  // effect on the tendon shows up the NEXT morning).
  const fullSleepTimelineData: SleepPainPoint[] = days.map((d) => ({
    date: d.date,
    sleepHours: d.sleepHours,
    painMorning: d.painMorning,
    painDaytime: d.painDaytime,
    painNight: d.painNight,
  }));

  // ── Progression, full history (physio days only) ──────────────────────
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
        physioVolume: Number(dailyPhysioVolume(d).toFixed(1)),
      };
    });

  // ── Heatmap: full calendar range, unlogged days included ──────────────
  // Deliberately ignores the selected time range — a heatmap narrowed to
  // "7D" would just be seven squares, which isn't what it's for.
  const byDate = new Map(days.map((d) => [d.date, d]));
  const heatmap: HeatmapDay[] = [];
  if (days.length > 0) {
    for (let date = days[0].date; date <= today; date = addDays(date, 1)) {
      const day = byDate.get(date);
      heatmap.push({ date, avgPain: day ? dailyPainAverage(day) : null });
    }
  }

  return (
    <main className="page" style={{ maxWidth: "64rem" }}>
      <header className="page-header">
        <h1>Welcome back, {user.name}.</h1>
        <p className="subtitle">
          {/* A template literal, not JSX text + {expr}: JSX collapses the
              whitespace around an expression when the surrounding text
              wraps across lines, silently eating the space right after
              {days.length} ("54days logged"). One expression sidesteps
              that entirely. */}
          {`${days.length} days logged · ${
            flareGap != null
              ? `${flareGap} ${flareGap === 1 ? "day" : "days"} since flare`
              : "no flares logged"
          }`}
        </p>
      </header>

      <DashboardCharts
        fullTimeline={fullTimeline}
        fullLoad={fullLoad}
        fullProgression={fullProgression}
        fullSleepTimelineData={fullSleepTimelineData}
        today={today}
      >
        <div className={styles.tiles}>
          <StatTile
            label="Avg pain (7D)"
            value={current.painAvg != null ? current.painAvg.toFixed(1) : "—"}
            unit="/10"
            delta={fmtDelta(current.painAvg, previous.painAvg, 1)}
            deltaIsGood={
              current.painAvg != null && previous.painAvg != null
                ? current.painAvg <= previous.painAvg
                : null
            }
            deltaLabel={statDeltaLabel}
            hint={`Average of each day's recorded morning/day/night pain combined, ${statRangePhrase}.`}
          />
          <StatTile
            label="Avg daily steps (7D)"
            value={
              current.stepsAvg != null
                ? Math.round(current.stepsAvg).toLocaleString()
                : "—"
            }
            delta={fmtDelta(
              current.stepsAvg != null ? Math.round(current.stepsAvg) : null,
              previous.stepsAvg != null ? Math.round(previous.stepsAvg) : null,
              0,
            )}
            deltaIsGood={
              current.stepsAvg != null && previous.stepsAvg != null
                ? current.stepsAvg >= previous.stepsAvg
                : null
            }
            deltaLabel={statDeltaLabel}
            hint={`Average of each day's daily steps, ${statRangePhrase}.`}
          />
          <StatTile
            label="Avg sleep (7D)"
            value={current.sleepAvg != null ? current.sleepAvg.toFixed(1) : "—"}
            unit="hrs"
            delta={fmtDelta(current.sleepAvg, previous.sleepAvg, 1)}
            deltaIsGood={
              current.sleepAvg != null && previous.sleepAvg != null
                ? current.sleepAvg >= previous.sleepAvg
                : null
            }
            deltaLabel={statDeltaLabel}
            hint={`Average of each night's sleep, ${statRangePhrase}.`}
          />
          <StatTile
            label="Physio load (7D)"
            value={
              currentPhysioLoadAvg != null
                ? Math.round(currentPhysioLoadAvg).toLocaleString()
                : "—"
            }
            delta={fmtDelta(
              currentPhysioLoadAvg != null ? Math.round(currentPhysioLoadAvg) : null,
              previousPhysioLoadAvg != null ? Math.round(previousPhysioLoadAvg) : null,
              0,
            )}
            deltaIsGood={
              currentPhysioLoadAvg != null && previousPhysioLoadAvg != null
                ? currentPhysioLoadAvg >= previousPhysioLoadAvg
                : null
            }
            deltaLabel={statDeltaLabel}
            hint={`Average of each day's physio load, ${statRangePhrase}. Physio load combines the physio sets, reps/duration, and intensity. Calculated by (sets * reps * average intensity)`}
          />
        </div>
      </DashboardCharts>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Calendar</h2>
        <p className={styles.cardSubtitle}>
          Average pain per day, at a glance.
        </p>
        <CalendarHeatmap data={heatmap} />
      </section>
    </main>
  );
}

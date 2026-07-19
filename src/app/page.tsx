// / — the dashboard (PLAN.md §3). Server component: loads all logs, maps
// them to domain shape, computes every derived series with the pure domain
// functions, and renders stat tiles + the four charts. No business logic
// here beyond wiring — calculations live in domain/, chart internals in
// components/charts/.
import { getCurrentUser } from "@/auth/get-current-user";
import { dailyLogRepository } from "@/repositories";
import { toDomainDays } from "@/lib/to-domain";
import { todayIso } from "@/lib/dates";
import { dailyPainAverage, windowComparison } from "@/domain/aggregate";
import { rollingAverage } from "@/domain/rolling";
import { dailyPhysioVolume } from "@/domain/volume";
import { daysSinceLastFlare, isFlareDay } from "@/domain/flare";
import { addDays, nextMorningPain } from "@/domain/lag";
import { StatTile } from "@/components/ui/stat-tile";
import {
  PainTimeline,
  type PainTimelinePoint,
} from "@/components/charts/pain-timeline";
import {
  LoadVsSymptoms,
  type LoadVsSymptomsPoint,
} from "@/components/charts/load-vs-symptoms";
import {
  ProgressionChart,
  type ProgressionPoint,
} from "@/components/charts/progression-chart";
import {
  CalendarHeatmap,
  type HeatmapDay,
} from "@/components/charts/calendar-heatmap";
import styles from "./dashboard.module.css";

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
  const logs = await dailyLogRepository.listAll(user.id);
  const days = toDomainDays(logs);
  const today = todayIso();

  // ── Stat tiles: this calendar week vs the previous one ────────────────
  const { current, previous } = windowComparison(days, today, 7);
  const flareGap = daysSinceLastFlare(days, today);

  // ── Pain timeline ─────────────────────────────────────────────────────
  const painAvgs = days.map(dailyPainAverage);
  const rolling = rollingAverage(painAvgs, 7);
  const timeline: PainTimelinePoint[] = days.map((d, i) => ({
    date: d.date,
    morning: d.painMorning,
    daytime: d.painDaytime,
    night: d.painNight,
    rollingAvg: rolling[i] != null ? Number(rolling[i]!.toFixed(2)) : null,
    flareValue: isFlareDay(d) ? painAvgs[i] : null,
  }));

  // ── Load vs symptoms (next-morning pain) ──────────────────────────────
  const nextPain = nextMorningPain(days);
  const load: LoadVsSymptomsPoint[] = days.map((d, i) => ({
    date: d.date,
    steps: d.steps,
    physioVolume: Number(dailyPhysioVolume(d).toFixed(1)),
    nextMorningPain: nextPain[i],
  }));

  // ── Progression (physio days only) ────────────────────────────────────
  const progression: ProgressionPoint[] = days
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
      };
    });

  // ── Heatmap: full calendar range, unlogged days included ──────────────
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
          {days.length} days logged · flare threshold 3/10 per physio guidance
        </p>
      </header>

      <div className={styles.tiles}>
        <StatTile
          label="7-day avg pain"
          value={current.painAvg != null ? current.painAvg.toFixed(1) : "—"}
          unit="/10"
          delta={fmtDelta(current.painAvg, previous.painAvg, 1)}
          deltaIsGood={
            current.painAvg != null && previous.painAvg != null
              ? current.painAvg <= previous.painAvg
              : null
          }
        />
        <StatTile
          label="7-day Avg daily steps"
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
        />
        <StatTile
          label="Physio volume"
          value={Math.round(current.physioVolume).toLocaleString()}
          delta={fmtDelta(
            Math.round(current.physioVolume),
            Math.round(previous.physioVolume),
            0,
          )}
          deltaIsGood={current.physioVolume >= previous.physioVolume}
        />
        <StatTile
          label="Days since flare"
          value={flareGap != null ? String(flareGap) : "—"}
          unit={flareGap === 1 ? "day" : "days"}
        />
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Pain over time</h2>
        <p className={styles.cardSubtitle}>
          Raw readings with the 7-day trend — the line that answers &ldquo;am I
          actually progressing?&rdquo;
        </p>
        <PainTimeline data={timeline} />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Load vs next-morning pain</h2>
        <p className={styles.cardSubtitle}>
          What you did each day, paired with how the tendon felt the next
          morning.
        </p>
        <LoadVsSymptoms data={load} />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Physio progression</h2>
        <p className={styles.cardSubtitle}>
          Intensity and hold volume across sessions — the program advancing is
          progress too.
        </p>
        <ProgressionChart data={progression} />
      </section>

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

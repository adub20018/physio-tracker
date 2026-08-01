// /dashboard — the dashboard (PLAN.md §3). Server component: loads all logs,
// maps them to domain shape, computes every derived series via the shared
// buildChartDataBundle (domain/dashboard-bundle.ts — also what the
// customizable-dashboard widget system draws from), and renders stat tiles
// + the calendar heatmap directly. The range-dependent charts render via
// <DashboardCharts>, a client component that owns the time-range picker's
// state and does its own (cheap, in-memory) filtering — see
// dashboard-charts.tsx for why that's a client component instead of a
// searchParam this page reads.
import { getCurrentUser } from "@/auth/get-current-user";
import { dailyLogRepository, userSettingsRepository } from "@/repositories";
import { toDomainDays } from "@/lib/to-domain";
import { todayIso } from "@/lib/dates";
import {
  TIME_RANGE_COMPARISON_LABELS,
  TIME_RANGE_HINT_PHRASES,
} from "@/lib/time-range";
import { buildChartDataBundle } from "@/domain/dashboard-bundle";
import { StatTile } from "@/components/ui/dashboard/stat-tile";
import { DashboardCharts } from "@/components/ui/dashboard/dashboard-charts";
import { SERIES } from "@/components/charts/chart-theme";
import { CalendarHeatmap } from "@/components/charts/calendar-heatmap";
import { BoneFracture } from "lucide-react";
import { Footprints } from "lucide-react";
import { BedDouble } from "lucide-react";
import { WeightTilde } from "lucide-react";
import { Info } from "lucide-react";
import { InfoTooltip } from "@/components/ui/shared/info-tooltip";
import styles from "@/components/ui/dashboard/dashboard.module.css";

// Always render at request time — the dashboard must reflect today's log.
export const dynamic = "force-dynamic";

// Formats a numeric delta as "0.4" (no sign — direction is conveyed by the
// tile's caret icon instead) plus its raw arithmetic direction; null when
// either side is missing.
function fmtDelta(
  current: number | null,
  previous: number | null,
  decimals: number,
): { text: string; direction: "up" | "down" } | null {
  if (current == null || previous == null) return null;
  const diff = current - previous;
  const text = Math.abs(diff).toFixed(decimals);
  return { text, direction: diff >= 0 ? "up" : "down" };
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const [logs, { flareThreshold, chartAutoScaleYAxis }] = await Promise.all([
    dailyLogRepository.listAll(user.id),
    userSettingsRepository.get(user.id),
  ]);
  const days = toDomainDays(logs);
  const today = await todayIso();

  // Every derived series any dashboard/insights chart could need, computed
  // once — see domain/dashboard-bundle.ts. Stat tiles always use a fixed
  // 7-day window regardless of the range picked in <DashboardCharts> below
  // (a "how am I doing right now" tile shouldn't smear an improving
  // baseline together with early, low numbers the way a wide-range chart
  // benefits from).
  const bundle = buildChartDataBundle(days, today, flareThreshold);
  const { statCurrent: current, statPrevious: previous, flareGap } = bundle;
  const statDeltaLabel = TIME_RANGE_COMPARISON_LABELS["7d"];
  const statRangePhrase = TIME_RANGE_HINT_PHRASES["7d"];

  const painDelta = fmtDelta(current.painAvg, previous.painAvg, 1);
  const stepsDelta = fmtDelta(
    current.stepsAvg != null ? Math.round(current.stepsAvg) : null,
    previous.stepsAvg != null ? Math.round(previous.stepsAvg) : null,
    0,
  );
  const sleepDelta = fmtDelta(current.sleepAvg, previous.sleepAvg, 1);
  const physioLoadDelta = fmtDelta(
    current.physioLoadAvg != null ? Math.round(current.physioLoadAvg) : null,
    previous.physioLoadAvg != null ? Math.round(previous.physioLoadAvg) : null,
    0,
  );

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
        fullTimeline={bundle.fullTimeline}
        fullLoad={bundle.fullLoad}
        fullProgression={bundle.fullProgression}
        fullSleepTimelineData={bundle.fullSleepTimelineData}
        today={today}
        autoScaleYAxis={chartAutoScaleYAxis}
      >
        <div className={styles.tiles}>
          <StatTile
            label="Avg pain (7D)"
            value={current.painAvg != null ? current.painAvg.toFixed(1) : "—"}
            unit="/10"
            delta={painDelta?.text}
            deltaDirection={painDelta?.direction}
            deltaIsGood={
              current.painAvg != null && previous.painAvg != null
                ? current.painAvg <= previous.painAvg
                : null
            }
            deltaLabel={statDeltaLabel}
            hint={`Average of each day's recorded morning/day/night pain combined, ${statRangePhrase}`}
            icon={<BoneFracture size={16} />}
            accentColor={SERIES.pain}
            sparklineValues={bundle.painSparkline}
            sparklineVariant="area"
          />
          <StatTile
            label="Avg daily steps (7D)"
            value={
              current.stepsAvg != null
                ? Math.round(current.stepsAvg).toLocaleString()
                : "—"
            }
            delta={stepsDelta?.text}
            deltaDirection={stepsDelta?.direction}
            deltaIsGood={
              current.stepsAvg != null && previous.stepsAvg != null
                ? current.stepsAvg >= previous.stepsAvg
                : null
            }
            deltaLabel={statDeltaLabel}
            hint={`Average of each day's daily steps, ${statRangePhrase}`}
            icon={<Footprints size={16} />}
            accentColor={SERIES.steps}
            sparklineValues={bundle.stepsSparkline}
          />
          <StatTile
            label="Avg sleep (7D)"
            value={current.sleepAvg != null ? current.sleepAvg.toFixed(1) : "—"}
            unit="hrs"
            delta={sleepDelta?.text}
            deltaDirection={sleepDelta?.direction}
            deltaIsGood={
              current.sleepAvg != null && previous.sleepAvg != null
                ? current.sleepAvg >= previous.sleepAvg
                : null
            }
            deltaLabel={statDeltaLabel}
            hint={`Average of each night's sleep, ${statRangePhrase}`}
            icon={<BedDouble size={16} />}
            accentColor={SERIES.sleep}
            sparklineValues={bundle.sleepSparkline}
          />
          <StatTile
            label="Physio load (7D)"
            value={
              current.physioLoadAvg != null
                ? Math.round(current.physioLoadAvg).toLocaleString()
                : "—"
            }
            delta={physioLoadDelta?.text}
            deltaDirection={physioLoadDelta?.direction}
            deltaIsGood={
              current.physioLoadAvg != null && previous.physioLoadAvg != null
                ? current.physioLoadAvg >= previous.physioLoadAvg
                : null
            }
            deltaLabel={statDeltaLabel}
            hint={`Average of each day's physio load, ${statRangePhrase}. Physio load combines the physio sets, reps/duration, and intensity. Calculated by (sets * reps * average intensity)`}
            icon={<WeightTilde size={16} />}
            accentColor={SERIES.load}
            sparklineValues={bundle.physioLoadSparkline}
            sparklineVariant="area"
          />
        </div>
      </DashboardCharts>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Calendar / Pain Heatmap</h2>
          <InfoTooltip
            text="Average pain per day, at a glance"
            label="What does this chart show?"
          >
            <Info size={14} />
          </InfoTooltip>
        </div>
        <CalendarHeatmap data={bundle.heatmap} />
      </section>
    </main>
  );
}

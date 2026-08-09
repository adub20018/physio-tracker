// Widget catalog for the customizable dashboard, keyed by `type` (stored in dashboard_widgets.widget_type).
// Range-dependent widgets share one time range owned by the dashboard; stat tiles stay on a fixed 7-day window.
"use client";

import { useMemo } from "react";
import { BoneFracture } from "lucide-react";
import { Footprints } from "lucide-react";
import { BedDouble } from "lucide-react";
import { WeightTilde } from "lucide-react";
import { Gauge } from "lucide-react";
import { filterWindow } from "@/domain/aggregate";
import { pearson, correlationStrength } from "@/domain/correlation";
import { workloadZone, type WorkloadZone } from "@/domain/workload";
import type { PairedPoint } from "@/domain/correlation";
import type { WidgetDataBundle } from "@/lib/widget-data";
import { StatTile } from "@/components/ui/dashboard/stat-tile";
import { FlareReview } from "@/components/ui/insights/flare-review";
import { WeeklyReportTable } from "@/components/ui/insights/weekly-report-table";
import { PainTimeline } from "@/components/charts/pain-timeline";
import { LoadVsSymptoms } from "@/components/charts/load-vs-symptoms";
import { SleepPainTimeline } from "@/components/charts/sleep-pain-timeline";
import { ProgressionChart } from "@/components/charts/progression-chart";
import { CalendarHeatmap } from "@/components/charts/calendar-heatmap";
import { WorkloadRatioChart } from "@/components/charts/workload-ratio-chart";
import { LagScatter } from "@/components/charts/scatter/lag-scatter";
import { MultiScatter } from "@/components/charts/scatter/multi-scatter";
import { PainCandleChart } from "@/components/charts/pain-candle-chart";
import { SERIES } from "@/components/charts/chart-theme";
import styles from "@/components/ui/dashboard/dashboard.module.css";

// Formats a delta as "0.4" (sign shown via caret icon instead) + direction.
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

export type WidgetCategory =
  "Stat tiles" | "Dashboard charts" | "Insights charts";

export type WidgetRenderContext = {
  widgetId: string;
  today: string;
  // Owned by the dashboard (not per-widget) so charts stay comparable.
  rangeDays: number;
  // Account → Preferences: fit Y-axis to visible data instead of fixed range.
  autoScaleYAxis: boolean;
  // Account → Preferences: the report widgets colour/count pain against it.
  flareThreshold: number;
  // True on desktop (real grid-cell height to fill); false on mobile stack.
  fillHeight: boolean;
  // Drag handle + remove button for "bare" (stat tile) widgets; undefined
  // when not editing.
  editControls?: React.ReactNode;
  // Add-widget picker thumbnails only: relaxes axis ticks, skips animation.
  compact?: boolean;
  // Independent of `compact` — hides the legend row in preview thumbnails.
  hideLegend?: boolean;
};

// Grid-unit size bounds passed to react-grid-layout (12 cols desktop / 2
// mobile). All four required — an omitted max would silently mean unbounded.
export type WidgetSizeBounds = {
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
};

// Grid width is 12 columns on desktop, 2 on the phone layout.
const DESKTOP_MAX_W = 12;
const MOBILE_MAX_W = 2;

// ~888px ceiling — guards against an accidental drag stranding the rest of
// the dashboard far below, not a real design constraint.
const TALL_MAX_H = 34;

export type WidgetDefinition = {
  type: string;
  label: string;
  category: WidgetCategory;
  defaultSize: { w: number; h: number };
  bounds: WidgetSizeBounds;
  // Same two, in the phone grid's units (2 cols) — sized independently.
  mobileDefaultSize: { w: number; h: number };
  mobileBounds: WidgetSizeBounds;
  // Stat tiles are already self-styled; the shell skips its own card wrapper.
  bare?: boolean;
  // InfoTooltip text for the shell header; unused for bare widgets.
  hint?: string;
  render: (
    bundle: WidgetDataBundle,
    ctx: WidgetRenderContext,
  ) => React.ReactNode;
};

// Stat tile bounds
const STAT_TILE_BOUNDS: WidgetSizeBounds = {
  minW: 3,
  maxW: 6,
  minH: 7,
  maxH: 7,
};
const MOBILE_STAT_TILE_BOUNDS: WidgetSizeBounds = {
  minW: 1,
  maxW: 2,
  minH: 9,
  maxH: 9,
};

// Single charts
const CHART_BOUNDS: WidgetSizeBounds = {
  minW: 6,
  maxW: DESKTOP_MAX_W,
  minH: 12,
  maxH: 24,
};
const MOBILE_CHART_BOUNDS: WidgetSizeBounds = {
  minW: MOBILE_MAX_W,
  maxW: MOBILE_MAX_W,
  minH: 12,
  maxH: 22,
};

// Double stacked charts
const DOUBLE_STACKED_CHART_BOUNDS: WidgetSizeBounds = {
  minW: 6,
  maxW: DESKTOP_MAX_W,
  minH: 18,
  maxH: 28,
};
const MOBILE_DOUBLE_STACKED_CHART_BOUNDS: WidgetSizeBounds = {
  minW: MOBILE_MAX_W,
  maxW: MOBILE_MAX_W,
  minH: 16,
  maxH: 26,
};

// Triple stacked charts
const TRIPLE_STACKED_CHART_BOUNDS: WidgetSizeBounds = {
  minW: 6,
  maxW: DESKTOP_MAX_W,
  minH: 20,
  maxH: TALL_MAX_H,
};
const MOBILE_TRIPLE_STACKED_CHART_BOUNDS: WidgetSizeBounds = {
  minW: MOBILE_MAX_W,
  maxW: MOBILE_MAX_W,
  minH: 20,
  maxH: TALL_MAX_H,
};

// Heatmap chart bounds
const HEATMAP_BOUNDS: WidgetSizeBounds = {
  minW: 4,
  maxW: DESKTOP_MAX_W,
  minH: 12,
  maxH: 12,
};
const MOBILE_HEATMAP_BOUNDS: WidgetSizeBounds = {
  minW: MOBILE_MAX_W,
  maxW: MOBILE_MAX_W,
  minH: 12,
  maxH: 12,
};

// Multi scatter bounds
const MULTI_SCATTER_CHART_BOUNDS: WidgetSizeBounds = {
  minW: 6,
  maxW: DESKTOP_MAX_W,
  minH: 16,
  maxH: 24,
};
const MOBILE_MULTI_SCATTER_CHART_BOUNDS: WidgetSizeBounds = {
  minW: MOBILE_MAX_W,
  maxW: MOBILE_MAX_W,
  minH: 14,
  maxH: 22,
};

// Report widgets (Flare review, Weekly report card): a scrolling accordion /
// table rather than a chart, so they want width for their columns and scroll
// internally past their minimum height instead of shrinking to fit.
const REPORT_BOUNDS: WidgetSizeBounds = {
  minW: 6,
  maxW: DESKTOP_MAX_W,
  minH: 14,
  maxH: TALL_MAX_H,
};
const MOBILE_REPORT_BOUNDS: WidgetSizeBounds = {
  minW: MOBILE_MAX_W,
  maxW: MOBILE_MAX_W,
  minH: 14,
  maxH: TALL_MAX_H,
};

// Whether a widget has multiple stacked panels — checked by reference
// against the shared bounds objects so it can't drift out of sync.
export function isStackedChart(definition: WidgetDefinition): boolean {
  return (
    definition.bounds === DOUBLE_STACKED_CHART_BOUNDS ||
    definition.bounds === TRIPLE_STACKED_CHART_BOUNDS
  );
}

// Filters full-history data down to ctx.rangeDays for every non-stat-tile,
// non-heatmap widget. `renderCaption` is optional (scatter widgets only).
function RangedChart<T extends { date: string }>({
  ctx,
  fullData,
  renderCaption,
  renderChart,
}: {
  ctx: WidgetRenderContext;
  fullData: T[];
  renderCaption?: (data: T[]) => React.ReactNode;
  renderChart: (data: T[]) => React.ReactNode;
}) {
  const data = useMemo(
    () => filterWindow(fullData, ctx.today, ctx.rangeDays),
    [fullData, ctx.today, ctx.rangeDays],
  );
  return (
    <>
      {!ctx.compact && renderCaption?.(data)}
      {renderChart(data)}
    </>
  );
}

// Header line for one scatter: "r = −0.21 · weak · 41 days". Returns null
// for zero points — the chart's own EmptyState already explains that case.
function correlationLine(points: PairedPoint[]): string | null {
  if (points.length === 0) return null;
  const r = pearson(points);
  if (r == null) return `not enough paired days yet (${points.length})`;
  const sign = r < 0 ? "−" : "";
  return `r = ${sign}${Math.abs(r).toFixed(2)} · ${correlationStrength(r)} · ${points.length} days`;
}

function ScatterCaption({ points }: { points: PairedPoint[] }) {
  const line = correlationLine(points);
  return line ? <p className={styles.cardSubtitle}>{line}</p> : null;
}

// The one multi-series special case (3 parallel series, 3 captions) — not
// worth forcing through RangedChart's single-array shape for just one widget.
function SleepVsPainWidget({
  bundle,
  ctx,
}: {
  bundle: WidgetDataBundle;
  ctx: WidgetRenderContext;
}) {
  const morning = useMemo(
    () => filterWindow(bundle.fullSleepVsMorning, ctx.today, ctx.rangeDays),
    [bundle.fullSleepVsMorning, ctx.today, ctx.rangeDays],
  );
  const daytime = useMemo(
    () => filterWindow(bundle.fullSleepVsDaytime, ctx.today, ctx.rangeDays),
    [bundle.fullSleepVsDaytime, ctx.today, ctx.rangeDays],
  );
  const night = useMemo(
    () => filterWindow(bundle.fullSleepVsNight, ctx.today, ctx.rangeDays),
    [bundle.fullSleepVsNight, ctx.today, ctx.rangeDays],
  );
  const morningLine = correlationLine(morning);
  const daytimeLine = correlationLine(daytime);
  const nightLine = correlationLine(night);

  return (
    <>
      {!ctx.compact && (morningLine || daytimeLine || nightLine) && (
        <ul className={styles.rList}>
          {morningLine && (
            <li style={{ color: SERIES.morning }}>Morning: {morningLine}</li>
          )}
          {daytimeLine && (
            <li style={{ color: SERIES.daytime }}>Daytime: {daytimeLine}</li>
          )}
          {nightLine && (
            <li style={{ color: SERIES.night }}>Night: {nightLine}</li>
          )}
        </ul>
      )}
      <MultiScatter
        series={[
          {
            key: "morning",
            label: "Morning",
            color: SERIES.morning,
            points: morning,
          },
          {
            key: "daytime",
            label: "Daytime",
            color: SERIES.daytime,
            points: daytime,
          },
          { key: "night", label: "Night", color: SERIES.night, points: night },
        ]}
        xLabel="Sleep (hours)"
        yLabel="Pain"
        autoScaleYAxis={ctx.autoScaleYAxis}
        fillHeight={ctx.fillHeight}
        compact={ctx.compact}
        hideLegend={ctx.hideLegend}
      />
    </>
  );
}

// Ratio tiles colour by zone rather than by metric identity (the usual StatTile rule):
// on these the zone *is* the headline, and "am I ramping too fast" should be readable
// without parsing the number. Amber for over, not red — a spike is worth a look, not an
// alarm (see domain/workload.ts on how much weight this deserves).
const WORKLOAD_ZONE_COLOR: Record<WorkloadZone, string> = {
  under: "var(--faint)",
  steady: SERIES.rollingAvg,
  over: "var(--pain-elevated)",
};

// One ratio stat tile. `pick` chooses which of the two ratios this tile tracks.
function WorkloadTile({
  label,
  bundle,
  ctx,
  ratio,
  pick,
  hint,
}: {
  label: string;
  bundle: WidgetDataBundle;
  ctx: WidgetRenderContext;
  ratio: number | null;
  pick: (point: WidgetDataBundle["fullWorkload"][number]) => number | null;
  hint: string;
}) {
  const color = ratio == null ? "var(--faint)" : WORKLOAD_ZONE_COLOR[workloadZone(ratio)];
  return (
    <StatTile
      label={label}
      value={ratio != null ? ratio.toFixed(2) : "—"}
      unit={ratio != null ? "×" : undefined}
      hint={hint}
      icon={<Gauge size={16} />}
      accentColor={color}
      sparklineValues={bundle.fullWorkload.slice(-7).map((p) => {
        const value = pick(p);
        return {
          date: p.date,
          value,
          display: value != null ? `${value.toFixed(2)}×` : "Not enough history",
        };
      })}
      sparklineVariant="area"
      actions={ctx.editControls}
      animate={!ctx.compact}
    />
  );
}

export const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  // ── Stat tiles ────────────────────────────────────────────────────────
  {
    type: "stat-pain",
    label: "Avg pain (7D)",
    category: "Stat tiles",
    defaultSize: { w: 3, h: 7 },
    bounds: STAT_TILE_BOUNDS,
    mobileDefaultSize: { w: 1, h: 9 },
    mobileBounds: MOBILE_STAT_TILE_BOUNDS,
    bare: true,
    render: (bundle, ctx) => {
      const { statCurrent: current, statPrevious: previous } = bundle;
      const delta = fmtDelta(current.painAvg, previous.painAvg, 1);
      return (
        <StatTile
          label="Avg pain"
          value={current.painAvg != null ? current.painAvg.toFixed(1) : "—"}
          unit="/10"
          delta={delta?.text}
          deltaDirection={delta?.direction}
          deltaIsGood={
            current.painAvg != null && previous.painAvg != null
              ? current.painAvg <= previous.painAvg
              : null
          }
          deltaLabel="vs previous week"
          hint={`Shows your average daily pain over 7 days, with a trend line showing how it has changed across each day in this period.\n\nUse it to answer: "Is my pain improving, worsening, or staying consistent?"`}
          icon={<BoneFracture size={16} />}
          accentColor={SERIES.pain}
          sparklineValues={bundle.painSparkline}
          sparklineVariant="area"
          actions={ctx.editControls}
          animate={!ctx.compact}
        />
      );
    },
  },
  {
    type: "stat-steps",
    label: "Avg daily steps (7D)",
    category: "Stat tiles",
    defaultSize: { w: 3, h: 7 },
    bounds: STAT_TILE_BOUNDS,
    mobileDefaultSize: { w: 1, h: 9 },
    mobileBounds: MOBILE_STAT_TILE_BOUNDS,
    bare: true,
    render: (bundle, ctx) => {
      const { statCurrent: current, statPrevious: previous } = bundle;
      const delta = fmtDelta(
        current.stepsAvg != null ? Math.round(current.stepsAvg) : null,
        previous.stepsAvg != null ? Math.round(previous.stepsAvg) : null,
        0,
      );
      return (
        <StatTile
          label="Avg daily steps"
          value={
            current.stepsAvg != null
              ? Math.round(current.stepsAvg).toLocaleString()
              : "—"
          }
          delta={delta?.text}
          deltaDirection={delta?.direction}
          deltaIsGood={
            current.stepsAvg != null && previous.stepsAvg != null
              ? current.stepsAvg >= previous.stepsAvg
              : null
          }
          deltaLabel="vs previous week"
          hint={`Shows your average daily steps over 7 days, showing how your activity has changed across each day in this period.\n\nUse it to answer: "Is my activity level increasing, decreasing, or staying consistent?"`}
          icon={<Footprints size={16} />}
          accentColor={SERIES.steps}
          sparklineValues={bundle.stepsSparkline}
          actions={ctx.editControls}
          animate={!ctx.compact}
        />
      );
    },
  },
  {
    type: "stat-sleep",
    label: "Avg sleep (7D)",
    category: "Stat tiles",
    defaultSize: { w: 3, h: 7 },
    bounds: STAT_TILE_BOUNDS,
    mobileDefaultSize: { w: 1, h: 9 },
    mobileBounds: MOBILE_STAT_TILE_BOUNDS,
    bare: true,
    render: (bundle, ctx) => {
      const { statCurrent: current, statPrevious: previous } = bundle;
      const delta = fmtDelta(current.sleepAvg, previous.sleepAvg, 1);
      return (
        <StatTile
          label="Avg sleep"
          value={current.sleepAvg != null ? current.sleepAvg.toFixed(1) : "—"}
          unit="hrs"
          delta={delta?.text}
          deltaDirection={delta?.direction}
          deltaIsGood={
            current.sleepAvg != null && previous.sleepAvg != null
              ? current.sleepAvg >= previous.sleepAvg
              : null
          }
          deltaLabel="vs previous week"
          hint={`Shows your average nightly sleep duration over 7 days, showing how your sleep has changed across each night in this period.\n\nUse it to answer: "Is my sleep improving, worsening, or staying consistent?"`}
          icon={<BedDouble size={16} />}
          accentColor={SERIES.sleep}
          sparklineValues={bundle.sleepSparkline}
          actions={ctx.editControls}
          animate={!ctx.compact}
        />
      );
    },
  },
  {
    type: "stat-physio-load",
    label: "Physio load (7D)",
    category: "Stat tiles",
    defaultSize: { w: 3, h: 7 },
    bounds: STAT_TILE_BOUNDS,
    mobileDefaultSize: { w: 1, h: 9 },
    mobileBounds: MOBILE_STAT_TILE_BOUNDS,
    bare: true,
    render: (bundle, ctx) => {
      const { statCurrent: current, statPrevious: previous } = bundle;
      const delta = fmtDelta(
        current.physioLoadAvg != null
          ? Math.round(current.physioLoadAvg)
          : null,
        previous.physioLoadAvg != null
          ? Math.round(previous.physioLoadAvg)
          : null,
        0,
      );
      return (
        <StatTile
          label="Physio load"
          value={
            current.physioLoadAvg != null
              ? Math.round(current.physioLoadAvg).toLocaleString()
              : "—"
          }
          delta={delta?.text}
          deltaDirection={delta?.direction}
          deltaIsGood={
            current.physioLoadAvg != null && previous.physioLoadAvg != null
              ? current.physioLoadAvg >= previous.physioLoadAvg
              : null
          }
          deltaLabel="vs previous week"
          hint={`Shows your average daily physio load over 7 days, with a trend line showing how your rehabilitation workload has changed across each day in this period.\n\nUse it to answer: "Is my rehabilitation workload increasing, decreasing, or staying consistent?"`}
          icon={<WeightTilde size={16} />}
          accentColor={SERIES.load}
          sparklineValues={bundle.physioLoadSparkline}
          sparklineVariant="area"
          actions={ctx.editControls}
          animate={!ctx.compact}
        />
      );
    },
  },

  {
    type: "stat-workload-physio",
    label: "Physio load ratio",
    category: "Stat tiles",
    defaultSize: { w: 3, h: 7 },
    bounds: STAT_TILE_BOUNDS,
    mobileDefaultSize: { w: 1, h: 9 },
    mobileBounds: MOBILE_STAT_TILE_BOUNDS,
    bare: true,
    render: (bundle, ctx) => (
      <WorkloadTile
        label="Physio load ratio"
        bundle={bundle}
        ctx={ctx}
        ratio={bundle.workloadNow.physioLoad}
        pick={(p) => p.physioLoadRatio}
        hint={`Your last 7 days of physio load divided by your last 28 — 1.00× means training at the baseline you've adapted to, higher means ramping ahead of it. Steady zone is 0.80–1.30×.\n\nUse it to answer: "Have I stepped up my physio faster than usual?"`}
      />
    ),
  },
  {
    type: "stat-workload-steps",
    label: "Step load ratio",
    category: "Stat tiles",
    defaultSize: { w: 3, h: 7 },
    bounds: STAT_TILE_BOUNDS,
    mobileDefaultSize: { w: 1, h: 9 },
    mobileBounds: MOBILE_STAT_TILE_BOUNDS,
    bare: true,
    render: (bundle, ctx) => (
      <WorkloadTile
        label="Step load ratio"
        bundle={bundle}
        ctx={ctx}
        ratio={bundle.workloadNow.steps}
        pick={(p) => p.stepsRatio}
        hint={`Your last 7 days of daily steps divided by your last 28 — 1.00× means walking about as much as you've built up to, higher means ramping ahead of it. Steady zone is 0.80–1.30×.\n\nUse it to answer: "Am I increasing my steps gradually?"`}
      />
    ),
  },

  // ── Dashboard charts ─────────────────────────────────────────────────
  {
    type: "chart-pain-timeline",
    label: "Pain over time",
    category: "Dashboard charts",
    defaultSize: { w: 12, h: 18 },
    bounds: CHART_BOUNDS,
    mobileDefaultSize: { w: 2, h: 18 },
    mobileBounds: MOBILE_CHART_BOUNDS,
    hint: 'Shows your morning, daytime, and night pain over time, alongside a 7-day trend line and highlighted flare days.\n\nUse it to answer: "Is my pain improving overall, or just fluctuating from day to day?"',
    render: (bundle, ctx) => (
      <RangedChart
        ctx={ctx}
        fullData={bundle.fullTimeline}
        renderChart={(data) => (
          <PainTimeline
            data={data}
            autoScaleYAxis={ctx.autoScaleYAxis}
            fillHeight={ctx.fillHeight}
            compact={ctx.compact}
            hideLegend={ctx.hideLegend}
          />
        )}
      />
    ),
  },
  {
    type: "chart-load-vs-pain",
    label: "Load vs next-day pain",
    category: "Dashboard charts",
    // h must match TRIPLE_STACKED_CHART_BOUNDS.minH or it spawns squashed.
    defaultSize: { w: 12, h: 20 },
    bounds: TRIPLE_STACKED_CHART_BOUNDS,
    mobileDefaultSize: { w: 2, h: 20 },
    mobileBounds: MOBILE_TRIPLE_STACKED_CHART_BOUNDS,
    hint: "Shows your daily steps and physio load alongside the following day's pain.\n\nUse it to answer: \"Did yesterday's workload contribute to today's pain?\"",
    render: (bundle, ctx) => (
      <RangedChart
        ctx={ctx}
        fullData={bundle.fullLoad}
        renderChart={(data) => (
          <LoadVsSymptoms
            data={data}
            autoScaleYAxis={ctx.autoScaleYAxis}
            fillHeight={ctx.fillHeight}
            compact={ctx.compact}
            hideLegend={ctx.hideLegend}
          />
        )}
      />
    ),
  },
  {
    type: "chart-sleep-pain",
    label: "Sleep & pain over time",
    category: "Dashboard charts",
    defaultSize: { w: 12, h: 18 },
    bounds: DOUBLE_STACKED_CHART_BOUNDS,
    mobileDefaultSize: { w: 2, h: 18 },
    mobileBounds: MOBILE_DOUBLE_STACKED_CHART_BOUNDS,
    hint: "Shows your sleep alongside your pain throughout the same day.\n\nUse it to answer: \"Does getting more or less sleep seem to affect my pain?\"",
    render: (bundle, ctx) => (
      <RangedChart
        ctx={ctx}
        fullData={bundle.fullSleepTimelineData}
        renderChart={(data) => (
          <SleepPainTimeline
            data={data}
            autoScaleYAxis={ctx.autoScaleYAxis}
            fillHeight={ctx.fillHeight}
            compact={ctx.compact}
            hideLegend={ctx.hideLegend}
          />
        )}
      />
    ),
  },
  {
    type: "chart-physio-progression",
    label: "Physio progression",
    category: "Dashboard charts",
    // h must match TRIPLE_STACKED_CHART_BOUNDS.minH or it spawns squashed.
    defaultSize: { w: 12, h: 20 },
    bounds: TRIPLE_STACKED_CHART_BOUNDS,
    mobileDefaultSize: { w: 2, h: 20 },
    mobileBounds: MOBILE_TRIPLE_STACKED_CHART_BOUNDS,
    hint: 'Shows how your rehabilitation program has progressed by tracking exercise intensity, hold volume, and overall physio load.\n\nUse it to answer: "Am I steadily progressing my rehabilitation program?"',
    render: (bundle, ctx) => (
      <RangedChart
        ctx={ctx}
        fullData={bundle.fullProgression}
        renderChart={(data) => (
          <ProgressionChart
            data={data}
            autoScaleYAxis={ctx.autoScaleYAxis}
            fillHeight={ctx.fillHeight}
            compact={ctx.compact}
            hideLegend={ctx.hideLegend}
          />
        )}
      />
    ),
  },
  {
    type: "chart-workload-ratio",
    label: "Workload ratio",
    category: "Dashboard charts",
    defaultSize: { w: 12, h: 18 },
    bounds: CHART_BOUNDS,
    mobileDefaultSize: { w: 2, h: 18 },
    mobileBounds: MOBILE_CHART_BOUNDS,
    hint: 'Shows your recent physio load and step count against the baseline you\'ve built up to, with the steady zone shaded.\n\nUse it to answer: "Am I ramping up faster than I\'ve adapted to?"',
    render: (bundle, ctx) => (
      <RangedChart
        ctx={ctx}
        fullData={bundle.fullWorkload}
        renderChart={(data) => (
          <WorkloadRatioChart
            data={data}
            fillHeight={ctx.fillHeight}
            compact={ctx.compact}
            hideLegend={ctx.hideLegend}
          />
        )}
      />
    ),
  },
  {
    type: "chart-heatmap",
    label: "Calendar / Pain Heatmap",
    category: "Dashboard charts",
    defaultSize: { w: 6, h: 12 },
    bounds: HEATMAP_BOUNDS,
    mobileDefaultSize: { w: 2, h: 12 },
    mobileBounds: MOBILE_HEATMAP_BOUNDS,
    hint: 'Shows your daily pain as a color-coded calendar, making patterns and flare periods easy to spot.\n\nUse it to answer: "When was my pain better or worse?"',
    // Ignores the selected time range — always shows full history.
    render: (bundle) => <CalendarHeatmap data={bundle.heatmap} />,
  },

  // ── Insights charts ──────────────────────────────────────────────────
  {
    type: "scatter-steps-morning",
    label: "Steps vs next-morning pain",
    category: "Insights charts",
    defaultSize: { w: 6, h: 18 },
    bounds: CHART_BOUNDS,
    mobileDefaultSize: { w: 2, h: 18 },
    mobileBounds: MOBILE_CHART_BOUNDS,
    hint: 'Shows the relationship between your daily steps and your pain the following morning.\n\nUse it to answer: "Do higher step counts lead to more pain the next morning?"',
    render: (bundle, ctx) => (
      <RangedChart
        ctx={ctx}
        fullData={bundle.fullStepsPoints}
        renderCaption={(data) => <ScatterCaption points={data} />}
        renderChart={(data) => (
          <LagScatter
            points={data}
            xLabel="Steps"
            yLabel="Next-morning pain"
            autoScaleYAxis={ctx.autoScaleYAxis}
            fillHeight={ctx.fillHeight}
            compact={ctx.compact}
          />
        )}
      />
    ),
  },
  {
    type: "scatter-steps-peak",
    label: "Steps vs peak next-day pain",
    category: "Insights charts",
    defaultSize: { w: 6, h: 18 },
    bounds: CHART_BOUNDS,
    mobileDefaultSize: { w: 2, h: 18 },
    mobileBounds: MOBILE_CHART_BOUNDS,
    hint: 'Shows the relationship between your daily steps and your highest pain the following day.\n\nUse it to answer: "Do higher step counts lead to worse pain the next day?"',
    render: (bundle, ctx) => (
      <RangedChart
        ctx={ctx}
        fullData={bundle.fullStepsVsPeakPoints}
        renderCaption={(data) => <ScatterCaption points={data} />}
        renderChart={(data) => (
          <LagScatter
            points={data}
            xLabel="Steps"
            yLabel="Peak next-day pain"
            autoScaleYAxis={ctx.autoScaleYAxis}
            fillHeight={ctx.fillHeight}
            compact={ctx.compact}
          />
        )}
      />
    ),
  },
  {
    type: "scatter-steps-average",
    label: "Steps vs average next-day pain",
    category: "Insights charts",
    defaultSize: { w: 6, h: 18 },
    bounds: CHART_BOUNDS,
    mobileDefaultSize: { w: 2, h: 18 },
    mobileBounds: MOBILE_CHART_BOUNDS,
    hint: 'Shows the relationship between your daily steps and your average pain the following day.\n\nUse it to answer: "Do higher step counts affect my overall pain the next day?"',
    render: (bundle, ctx) => (
      <RangedChart
        ctx={ctx}
        fullData={bundle.fullStepsVsAveragePoints}
        renderCaption={(data) => <ScatterCaption points={data} />}
        renderChart={(data) => (
          <LagScatter
            points={data}
            xLabel="Steps"
            yLabel="Average next-day pain"
            autoScaleYAxis={ctx.autoScaleYAxis}
            fillHeight={ctx.fillHeight}
            compact={ctx.compact}
          />
        )}
      />
    ),
  },
  {
    type: "scatter-load-morning",
    label: "Physio load vs next-morning pain",
    category: "Insights charts",
    defaultSize: { w: 6, h: 18 },
    bounds: CHART_BOUNDS,
    mobileDefaultSize: { w: 2, h: 18 },
    mobileBounds: MOBILE_CHART_BOUNDS,
    hint: 'Shows the relationship between your physio load and your pain the following morning.\n\nUse it to answer: "Does increasing my physio workload affect my pain the next morning?"',
    render: (bundle, ctx) => (
      <RangedChart
        ctx={ctx}
        fullData={bundle.fullVolumePoints}
        renderCaption={(data) => <ScatterCaption points={data} />}
        renderChart={(data) => (
          <LagScatter
            points={data}
            xLabel="Physio load"
            yLabel="Next-morning pain"
            autoScaleYAxis={ctx.autoScaleYAxis}
            fillHeight={ctx.fillHeight}
            compact={ctx.compact}
          />
        )}
      />
    ),
  },
  {
    type: "scatter-load-peak",
    label: "Physio load vs peak next-day pain",
    category: "Insights charts",
    defaultSize: { w: 6, h: 18 },
    bounds: CHART_BOUNDS,
    mobileDefaultSize: { w: 2, h: 18 },
    mobileBounds: MOBILE_CHART_BOUNDS,
    hint: 'Shows the relationship between your physio load and your highest pain the following day.\n\nUse it to answer: "Does increasing my physio workload lead to worse pain the next day?"',
    render: (bundle, ctx) => (
      <RangedChart
        ctx={ctx}
        fullData={bundle.fullVolumeVsPeakPoints}
        renderCaption={(data) => <ScatterCaption points={data} />}
        renderChart={(data) => (
          <LagScatter
            points={data}
            xLabel="Physio load"
            yLabel="Peak next-day pain"
            autoScaleYAxis={ctx.autoScaleYAxis}
            fillHeight={ctx.fillHeight}
            compact={ctx.compact}
          />
        )}
      />
    ),
  },
  {
    type: "scatter-load-average",
    label: "Physio load vs average next-day pain",
    category: "Insights charts",
    defaultSize: { w: 6, h: 18 },
    bounds: CHART_BOUNDS,
    mobileDefaultSize: { w: 2, h: 18 },
    mobileBounds: MOBILE_CHART_BOUNDS,
    hint: 'Shows the relationship between your physio load and your average pain the following day.\n\nUse it to answer: "Does increasing my physio workload affect my overall pain the next day?"',
    render: (bundle, ctx) => (
      <RangedChart
        ctx={ctx}
        fullData={bundle.fullVolumeVsAveragePoints}
        renderCaption={(data) => <ScatterCaption points={data} />}
        renderChart={(data) => (
          <LagScatter
            points={data}
            xLabel="Physio load"
            yLabel="Average next-day pain"
            autoScaleYAxis={ctx.autoScaleYAxis}
            fillHeight={ctx.fillHeight}
            compact={ctx.compact}
          />
        )}
      />
    ),
  },
  {
    type: "chart-pain-candle",
    label: "Morning-to-day pain",
    category: "Insights charts",
    defaultSize: { w: 6, h: 18 },
    bounds: CHART_BOUNDS,
    mobileDefaultSize: { w: 2, h: 18 },
    mobileBounds: MOBILE_CHART_BOUNDS,
    hint: 'Shows how your pain changes throughout each day, from morning to night.\n\nUse it to answer: "Does my pain usually improve or worsen as the day goes on?"',
    render: (bundle, ctx) => (
      <RangedChart
        ctx={ctx}
        fullData={bundle.fullPainCandles}
        renderChart={(data) => (
          <PainCandleChart
            data={data}
            autoScaleYAxis={ctx.autoScaleYAxis}
            fillHeight={ctx.fillHeight}
            compact={ctx.compact}
            hideLegend={ctx.hideLegend}
          />
        )}
      />
    ),
  },
  {
    type: "scatter-sleep-pain",
    label: "Sleep vs pain, all day",
    category: "Insights charts",
    defaultSize: { w: 6, h: 18 },
    bounds: MULTI_SCATTER_CHART_BOUNDS,
    mobileDefaultSize: { w: 2, h: 18 },
    mobileBounds: MOBILE_MULTI_SCATTER_CHART_BOUNDS,
    hint: 'Shows the relationship between your sleep and your pain throughout the same day.\n\nUse it to answer: "Does getting more sleep seem to affect my pain?"',
    render: (bundle, ctx) => <SleepVsPainWidget bundle={bundle} ctx={ctx} />,
  },
  {
    type: "report-flare-review",
    label: "Flare review",
    category: "Insights charts",
    defaultSize: { w: 6, h: 18 },
    bounds: REPORT_BOUNDS,
    mobileDefaultSize: { w: 2, h: 18 },
    mobileBounds: MOBILE_REPORT_BOUNDS,
    hint: 'Shows every flare day alongside the activity, physio, and notes from the days leading up to it.\n\nUse it to answer: "What happened before my flare-up?"',
    // Ignores the selected time range — a flare history is only useful whole,
    // same reasoning as the calendar heatmap above.
    render: (bundle) => (
      <div className={styles.scrollBody}>
        <FlareReview episodes={bundle.flareEpisodeViews} />
      </div>
    ),
  },
  {
    type: "report-weekly",
    label: "Weekly report card",
    category: "Insights charts",
    defaultSize: { w: 6, h: 18 },
    bounds: REPORT_BOUNDS,
    mobileDefaultSize: { w: 2, h: 18 },
    mobileBounds: MOBILE_REPORT_BOUNDS,
    hint: 'Shows a weekly summary of your pain, activity, physio load, and flare count.\n\nUse it to answer: "How does each week compare with the last?"',
    // Range-independent for the same reason as Flare review: the point is
    // comparing every week to the last.
    render: (bundle, ctx) => (
      <div className={styles.scrollBody}>
        <WeeklyReportTable
          rows={bundle.weeklyRows}
          flareThreshold={ctx.flareThreshold}
        />
      </div>
    ),
  },
];

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> =
  Object.fromEntries(WIDGET_DEFINITIONS.map((def) => [def.type, def]));

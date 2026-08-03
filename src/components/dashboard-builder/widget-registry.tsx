// The widget catalog: every chart/stat-tile that can be placed on a
// customizable dashboard, keyed by a stable `type` string stored in
// dashboard_widgets.widget_type. A widget definition is glue, not new chart
// logic — every `render` function reuses the exact chart components
// dashboard/page.tsx and insights/page.tsx already use, just fed from the
// shared ChartDataBundle instead of page-local variables.
//
// Range-dependent widgets (everything except stat tiles and the heatmap)
// all read one shared time range, owned by the dashboard and set from its
// config popover — a dashboard is one view of one period, and charts sitting
// side by side on different ranges can't be read against each other. Stat
// tiles stay on their own fixed 7-day window regardless, and the heatmap
// deliberately always shows full history.
"use client";

import { useMemo } from "react";
import { BoneFracture } from "lucide-react";
import { Footprints } from "lucide-react";
import { BedDouble } from "lucide-react";
import { WeightTilde } from "lucide-react";
import { filterWindow } from "@/domain/aggregate";
import { TIME_RANGE_HINT_PHRASES } from "@/lib/time-range";
import { pearson, correlationStrength } from "@/domain/correlation";
import type { PairedPoint } from "@/domain/correlation";
import type { ChartDataBundle } from "@/domain/dashboard-bundle";
import { StatTile } from "@/components/ui/dashboard/stat-tile";
import { PainTimeline } from "@/components/charts/pain-timeline";
import { LoadVsSymptoms } from "@/components/charts/load-vs-symptoms";
import { SleepPainTimeline } from "@/components/charts/sleep-pain-timeline";
import { ProgressionChart } from "@/components/charts/progression-chart";
import { CalendarHeatmap } from "@/components/charts/calendar-heatmap";
import { LagScatter } from "@/components/charts/scatter/lag-scatter";
import { MultiScatter } from "@/components/charts/scatter/multi-scatter";
import { PainCandleChart } from "@/components/charts/pain-candle-chart";
import { SERIES } from "@/components/charts/chart-theme";
import styles from "@/components/ui/dashboard/dashboard.module.css";

// Formats a numeric delta as "0.4" (no sign — direction is conveyed by the
// tile's caret icon instead) plus its raw arithmetic direction; null when
// either side is missing. Display formatting, not domain logic — moved here
// from dashboard/page.tsx, the only place stat tiles are built now.
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
  // The widget's own DB row id.
  widgetId: string;
  today: string;
  // How far back the range-dependent widgets look, in days. Owned by the
  // dashboard (set in its config popover) rather than per widget: one
  // dashboard is one view of a period, so having each chart on its own
  // range made them impossible to read against each other.
  rangeDays: number;
  // Account → Preferences: fit each chart's Y-axis to the visible data
  // instead of a fixed range.
  autoScaleYAxis: boolean;
  // True on the desktop grid, where the widget's cell has a real height the
  // user can drag — the chart then fills that height instead of rendering
  // at its fixed pixel size. False in the mobile stack, which has no
  // definite height to fill (a chart there would collapse to nothing).
  fillHeight: boolean;
  // Edit mode's drag handle + remove button, supplied by WidgetShell. Only
  // "bare" widgets (stat tiles) read this — they have no card header for
  // the shell to put the controls in, so they place them inside their own
  // header instead, which keeps their height the same in edit mode as out
  // of it. Undefined when not editing.
  editControls?: React.ReactNode;
};

// Grid-unit size bounds for one widget type, in the same units as x/y/w/h
// (12 columns on desktop / 2 on mobile; one row step is 20px — see
// ROW_HEIGHT in dashboard-grid.tsx). Passed straight to react-grid-layout,
// which clamps live during a resize drag rather than letting a widget be
// dragged into a size where it stops being readable.
//
// All four are required, not optional: an omitted maximum silently means
// "unbounded", which is a decision worth making explicitly per widget
// rather than by forgetting. The constants below are shared by widgets
// with the same needs, but any definition can supply its own object
// instead — bounds are per widget type, not per category.
export type WidgetSizeBounds = {
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
};

// Grid width is 12 columns on desktop, 2 on the phone layout.
const DESKTOP_MAX_W = 12;
const MOBILE_MAX_W = 2;

// ~888px. A ceiling rather than a real constraint: tall is fine, but a
// widget dragged to several screens high is almost always a slip, and an
// unbounded drag can leave the rest of the dashboard stranded far below.
const TALL_MAX_H = 34;

export type WidgetDefinition = {
  type: string;
  label: string;
  category: WidgetCategory;
  defaultSize: { w: number; h: number };
  bounds: WidgetSizeBounds;
  // The same two, in the phone grid's units (2 columns — see MOBILE_COLS in
  // dashboard-grid.tsx). Separate because a size that reads well across 12
  // desktop columns means nothing across 2, and because the minimum heights
  // differ: content that fits on one line at full width wraps at half.
  mobileDefaultSize: { w: number; h: number };
  mobileBounds: WidgetSizeBounds;
  // True for widgets that are already a complete, self-styled unit (stat
  // tiles) — the widget shell skips its own .card/.cardHeader wrapper for
  // these, since double-framing would look wrong.
  bare?: boolean;
  // InfoTooltip text for the widget shell's header — unused for bare
  // widgets, which already carry their own hint (StatTile's own tooltip).
  hint?: string;
  render: (
    bundle: ChartDataBundle,
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

// Shared range-filtering wrapper for every non-stat-tile, non-heatmap
// widget: owns one widget's independent persisted range selection, filters
// its full-history data down to that range, and renders the picker above
// whatever the caller passes as children. `renderCaption` is optional
// (scatter widgets show a correlation line; the 4 dashboard charts don't).
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
      {renderCaption?.(data)}
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
  bundle: ChartDataBundle;
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
      {(morningLine || daytimeLine || nightLine) && (
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
      />
    </>
  );
}

const statRangePhrase = TIME_RANGE_HINT_PHRASES["7d"];

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
          hint={`Average of each day's recorded morning/day/night pain combined, ${statRangePhrase}`}
          icon={<BoneFracture size={16} />}
          accentColor={SERIES.pain}
          sparklineValues={bundle.painSparkline}
          sparklineVariant="area"
          actions={ctx.editControls}
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
          hint={`Average of each day's daily steps, ${statRangePhrase}`}
          icon={<Footprints size={16} />}
          accentColor={SERIES.steps}
          sparklineValues={bundle.stepsSparkline}
          actions={ctx.editControls}
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
          hint={`Average of each night's sleep, ${statRangePhrase}`}
          icon={<BedDouble size={16} />}
          accentColor={SERIES.sleep}
          sparklineValues={bundle.sleepSparkline}
          actions={ctx.editControls}
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
          hint={`Average of each day's physio load, ${statRangePhrase}. Physio load combines the physio sets, reps/duration, and intensity. Calculated by (sets * reps * average intensity)`}
          icon={<WeightTilde size={16} />}
          accentColor={SERIES.load}
          sparklineValues={bundle.physioLoadSparkline}
          sparklineVariant="area"
          actions={ctx.editControls}
        />
      );
    },
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
    hint: 'Raw readings with the 7-day trend — the line that answers "am I actually progressing?"',
    render: (bundle, ctx) => (
      <RangedChart
        ctx={ctx}
        fullData={bundle.fullTimeline}
        renderChart={(data) => (
          <PainTimeline
            data={data}
            autoScaleYAxis={ctx.autoScaleYAxis}
            fillHeight={ctx.fillHeight}
          />
        )}
      />
    ),
  },
  {
    type: "chart-load-vs-pain",
    label: "Load vs next-day pain",
    category: "Dashboard charts",
    defaultSize: { w: 12, h: 18 },
    bounds: TRIPLE_STACKED_CHART_BOUNDS,
    mobileDefaultSize: { w: 2, h: 18 },
    mobileBounds: MOBILE_TRIPLE_STACKED_CHART_BOUNDS,
    hint: "What you did each day, paired with how the tendon felt across all of the next day's readings — morning, daytime, and night. Load can show up at any point the next day, not just the first reading taken. Physio load here is the same intensity-weighted metric as the dashboard tile, shown per day instead of summed over the week",
    render: (bundle, ctx) => (
      <RangedChart
        ctx={ctx}
        fullData={bundle.fullLoad}
        renderChart={(data) => (
          <LoadVsSymptoms
            data={data}
            autoScaleYAxis={ctx.autoScaleYAxis}
            fillHeight={ctx.fillHeight}
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
    hint: "Sleep the night before, and how the whole next day felt — sleep hours logged on a date are the hours slept the night before waking up that day, so they precede all three of that day's readings",
    render: (bundle, ctx) => (
      <RangedChart
        ctx={ctx}
        fullData={bundle.fullSleepTimelineData}
        renderChart={(data) => (
          <SleepPainTimeline
            data={data}
            autoScaleYAxis={ctx.autoScaleYAxis}
            fillHeight={ctx.fillHeight}
          />
        )}
      />
    ),
  },
  {
    type: "chart-physio-progression",
    label: "Physio progression",
    category: "Dashboard charts",
    defaultSize: { w: 12, h: 18 },
    bounds: TRIPLE_STACKED_CHART_BOUNDS,
    mobileDefaultSize: { w: 2, h: 18 },
    mobileBounds: MOBILE_TRIPLE_STACKED_CHART_BOUNDS,
    hint: "Intensity range, hold volume, and Physio load across sessions — the program advancing is progress too. Hold volume and Physio load can move in opposite directions (e.g. longer holds at lower intensity raise one and lower the other), so both are shown rather than just one",
    render: (bundle, ctx) => (
      <RangedChart
        ctx={ctx}
        fullData={bundle.fullProgression}
        renderChart={(data) => (
          <ProgressionChart
            data={data}
            autoScaleYAxis={ctx.autoScaleYAxis}
            fillHeight={ctx.fillHeight}
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
    hint: "Average pain per day, at a glance",
    // Deliberately ignores the selected time range, same as today — a
    // heatmap narrowed to "7D" would just be seven squares.
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
    hint: "Data is lagged (day-over-day) so the steps are compared to the next morning's pain",
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
    hint: "Steps compared to the highest of the next day's three pain readings (morning, daytime, night) — the worst moment that day reached, not just its morning level",
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
    hint: "Steps compared to the average of the next day's three pain readings — the day's overall level, rather than any one reading",
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
    hint: "Physio Load represents the overall load of a physio exercise. Calculated by (sets * reps * average intensity). Data is lagged (day-over-day) so the physio load are compared to the next morning's pain",
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
    hint: "Physio load compared to the highest of the next day's three pain readings — the worst moment that day reached, not just its morning level",
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
    hint: "Physio load compared to the average of the next day's three pain readings — the day's overall level, rather than any one reading",
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
    hint: "Each candle is one day's pain movement, in the same terms as a stock candlestick: open = morning pain, high/low = that day's highest and lowest reading, close = night pain. Green means pain came down by night; red means it went up",
    render: (bundle, ctx) => (
      <RangedChart
        ctx={ctx}
        fullData={bundle.fullPainCandles}
        renderChart={(data) => (
          <PainCandleChart
            data={data}
            autoScaleYAxis={ctx.autoScaleYAxis}
            fillHeight={ctx.fillHeight}
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
    hint: "Same day, not lagged — sleep hours logged on a date are the hours slept the night before waking up that day, so they precede all three of that day's readings, not just the morning one",
    render: (bundle, ctx) => <SleepVsPainWidget bundle={bundle} ctx={ctx} />,
  },
];

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> =
  Object.fromEntries(WIDGET_DEFINITIONS.map((def) => [def.type, def]));

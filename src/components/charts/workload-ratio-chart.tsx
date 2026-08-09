// Acute:chronic workload ratio (ACWR) — recent load (7d) over the baseline you're adapted
// to (28d), for physio and steps together since both are usually being ramped at once.
// Bands mark the conventional zones; `showBars` adds each day's own load on the same axis.
"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHART_CHROME,
  CHART_Y_AXIS,
  SERIES,
  TOOLTIP_STYLE,
  shortDate,
} from "./chart-theme";
import {
  WORKLOAD_DANGER_MIN,
  WORKLOAD_STEADY_MAX,
  WORKLOAD_STEADY_MIN,
} from "@/domain/workload";
import { EmptyState } from "@/components/ui/shared/empty-state";
import { useChartTooltipSuppression } from "./use-chart-tooltip-suppression";
import styles from "./charts.module.css";

export type WorkloadRatioPoint = {
  date: string;
  physioLoadRatio: number | null;
  stepsRatio: number | null;
  physioLoadDayRatio: number | null;
  stepsDayRatio: number | null;
};

const LINES = [
  { key: "physioLoadRatio", label: "Physio load", color: SERIES.load },
  { key: "stepsRatio", label: "Steps", color: SERIES.steps },
] as const;

const BARS = [
  { key: "physioLoadDayRatio", label: "Physio load (that day)", color: SERIES.load },
  { key: "stepsDayRatio", label: "Steps (that day)", color: SERIES.steps },
] as const;

// Zone fills. Green/amber/red match the pain severity scale used elsewhere, so the
// colours carry the same meaning across the app.
const ZONE_BANDS = [
  { from: 0, to: WORKLOAD_STEADY_MIN, fill: "var(--faint)", opacity: 0.06 },
  {
    from: WORKLOAD_STEADY_MIN,
    to: WORKLOAD_STEADY_MAX,
    fill: "var(--pain-none)",
    opacity: 0.13,
  },
  {
    from: WORKLOAD_STEADY_MAX,
    to: WORKLOAD_DANGER_MIN,
    fill: "var(--pain-elevated)",
    opacity: 0.13,
  },
] as const;

function WorkloadTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: {
    dataKey?: string;
    name?: string;
    value?: number | null;
    color?: string;
  }[];
  label?: string;
}) {
  if (!active || !payload) return null;
  const rows = payload.filter((p) => p.value != null);
  if (rows.length === 0) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ color: "var(--muted)", marginBottom: 4 }}>{label}</div>
      {rows.map((r) => (
        <div key={r.dataKey}>
          <span style={{ color: r.color }}>{r.name}</span>:{" "}
          {r.value!.toFixed(2)}×
        </div>
      ))}
    </div>
  );
}

export function WorkloadRatioChart({
  data,
  showBars = false,
  fillHeight = false,
  compact = false,
  hideLegend = false,
}: {
  data: WorkloadRatioPoint[];
  // Overlay each day's own load against the baseline — the individual spikes the
  // 7-day rolling ratio smooths away.
  showBars?: boolean;
  fillHeight?: boolean;
  compact?: boolean;
  hideLegend?: boolean;
}) {
  const {
    suppressed: tooltipSuppressed,
    onChartClick,
    containerRef,
  } = useChartTooltipSuppression();

  // Every slot is null until ~2 weeks of history exists, which would otherwise render
  // as an empty grid with no explanation of why.
  const hasRatios = data.some(
    (d) => d.physioLoadRatio != null || d.stepsRatio != null,
  );
  if (!hasRatios) {
    return (
      <EmptyState
        message="Not enough logged history yet"
        height={280}
        fill={fillHeight}
      />
    );
  }

  // Explicit domain rather than "auto": the top band has to be drawn up to a known
  // number, and an auto domain could leave headroom above it unshaded.
  const ratios = data.flatMap((d) =>
    [d.physioLoadRatio, d.stepsRatio].filter((v): v is number => v != null),
  );
  const ratioMax = Math.max(WORKLOAD_DANGER_MIN + 0.3, ...ratios);

  // Bars get their own axis. A single hard day routinely lands several times the
  // baseline — sharing the ratio's scale would squash the lines and every zone band
  // into the bottom of the plot, which is the part actually being read.
  const dayRatios = data.flatMap((d) =>
    [d.physioLoadDayRatio, d.stepsDayRatio].filter((v): v is number => v != null),
  );
  const dayMax = Math.max(1, ...dayRatios);

  return (
    <div className={fillHeight ? styles.fill : undefined}>
      {!hideLegend && (
        <div className={styles.legend}>
          {LINES.map((l) => (
            <span key={l.key} className={styles.legendItem}>
              <span
                className={styles.legendLine}
                style={{ background: l.color }}
              />
              {l.label}
            </span>
          ))}
          {showBars && (
            <span className={styles.legendItem}>
              <span
                className={styles.legendSwatch}
                style={{ background: "var(--muted)", opacity: 0.45 }}
              />
              Bars: that day alone (right axis)
            </span>
          )}
        </div>
      )}
      <ResponsiveContainer
        ref={containerRef}
        width="100%"
        height={fillHeight ? "100%" : 260}
        className={fillHeight ? styles.fillChart : undefined}
      >
        <ComposedChart
          data={data}
          onClick={onChartClick}
          onTouchStart={onChartClick}
          onMouseDown={onChartClick}
          accessibilityLayer={false}
          margin={{ top: 6, right: 12, bottom: 0, left: -18 }}
        >
          <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
          {/* Declared before the data marks so the bands sit behind them. */}
          {ZONE_BANDS.map((band) => (
            <ReferenceArea
              key={band.from}
              yAxisId="ratio"
              y1={band.from}
              y2={band.to}
              fill={band.fill}
              fillOpacity={band.opacity}
              strokeOpacity={0}
            />
          ))}
          <ReferenceArea
            yAxisId="ratio"
            y1={WORKLOAD_DANGER_MIN}
            y2={ratioMax}
            fill="var(--pain-flare)"
            fillOpacity={0.13}
            strokeOpacity={0}
          />
          <ReferenceLine
            yAxisId="ratio"
            y={1}
            stroke={CHART_CHROME.axisLine}
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={CHART_CHROME.tick}
            axisLine={{ stroke: CHART_CHROME.axisLine }}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            {...CHART_Y_AXIS}
            yAxisId="ratio"
            domain={[0, ratioMax]}
            interval={compact ? "preserveStart" : 0}
          />
          <YAxis
            {...CHART_Y_AXIS}
            yAxisId="day"
            orientation="right"
            width={showBars ? 32 : 0}
            domain={[0, dayMax]}
            hide={!showBars}
            interval={compact ? "preserveStart" : 0}
          />
          <Tooltip
            content={<WorkloadTooltipContent />}
            cursor={{ stroke: CHART_CHROME.axisLine }}
            active={tooltipSuppressed ? false : undefined}
          />
          {showBars &&
            BARS.map((b) => (
              <Bar
                key={b.key}
                yAxisId="day"
                dataKey={b.key}
                name={b.label}
                fill={b.color}
                fillOpacity={0.32}
                isAnimationActive={!compact}
                animationBegin={0}
                animationDuration={300}
                animationEasing="linear"
              />
            ))}
          {/* After the bars so the trend lines read on top of them. */}
          {LINES.map((l) => (
            <Line
              key={l.key}
              yAxisId="ratio"
              dataKey={l.key}
              name={l.label}
              stroke={l.color}
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={!compact}
              animationBegin={0}
              animationDuration={300}
              animationEasing="linear"
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

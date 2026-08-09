// The ACWR zones expressed in one metric's own units. The 28-day baseline is drawn as a
// line and the ratio thresholds multiplied through it become a corridor that moves as
// the baseline does — so "how much can I do right now" is readable in steps or load
// rather than as an abstract multiplier.
//
// The corridor bounds the 7-day average, which is what the thresholds were derived for.
// A single hard day is fine as long as the week's average stays inside it, which is why
// only the acute mean is plotted here and daily values deliberately are not.
"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHART_CHROME,
  CHART_Y_AXIS,
  TOOLTIP_STYLE,
  shortDate,
} from "./chart-theme";
import { zoneBoundsFor } from "@/domain/workload";
import { EmptyState } from "@/components/ui/shared/empty-state";
import { niceStep, roundUpTo, stepTicks } from "./axis-scale";
import { useChartTooltipSuppression } from "./use-chart-tooltip-suppression";
import styles from "./charts.module.css";

export type LoadZonePoint = {
  date: string;
  baseline: number | null;
  acute: number | null;
};

// Recharts stacks areas by summing, so each band is stored as its height above the one
// below rather than as an absolute edge.
type Row = LoadZonePoint & {
  bandUnder: number | null;
  bandSteady: number | null;
  bandCaution: number | null;
  bandDanger: number | null;
  steadyMin: number | null;
  steadyMax: number | null;
};

function ZoneTooltipContent({
  active,
  payload,
  label,
  formatValue,
  unit,
}: {
  active?: boolean;
  payload?: { payload?: Row }[];
  label?: string;
  formatValue: (value: number) => string;
  unit: string;
}) {
  const row = active ? payload?.[0]?.payload : undefined;
  if (!row || row.baseline == null) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ color: "var(--muted)", marginBottom: 4 }}>{label}</div>
      {row.acute != null && (
        <div>7-day average: {formatValue(row.acute)}</div>
      )}
      <div style={{ color: "var(--muted)" }}>
        Baseline (28d): {formatValue(row.baseline)}
      </div>
      {row.steadyMin != null && row.steadyMax != null && (
        <div style={{ color: "var(--pain-none)" }}>
          Steady: {formatValue(row.steadyMin)}–{formatValue(row.steadyMax)} {unit}
        </div>
      )}
    </div>
  );
}

export function LoadZoneChart({
  data,
  color,
  unit,
  formatValue,
  emptyMessage,
  fillHeight = false,
  compact = false,
  hideLegend = false,
}: {
  data: LoadZonePoint[];
  // This metric's identity color, matching its other charts.
  color: string;
  // Short unit shown in the tooltip's range line ("steps", "load").
  unit: string;
  formatValue: (value: number) => string;
  emptyMessage: string;
  fillHeight?: boolean;
  compact?: boolean;
  hideLegend?: boolean;
}) {
  const {
    suppressed: tooltipSuppressed,
    onChartClick,
    containerRef,
  } = useChartTooltipSuppression();

  const hasBaseline = data.some((d) => d.baseline != null);
  if (!hasBaseline) {
    return <EmptyState message={emptyMessage} height={280} fill={fillHeight} />;
  }

  // Headroom above the danger edge so the top band is visibly a band, not a hairline.
  const plotted = data.flatMap((d) => {
    const bounds = zoneBoundsFor(d.baseline);
    return [d.acute, bounds?.dangerMin].filter((v): v is number => v != null);
  });
  const step = niceStep(Math.max(...plotted) * 1.15);
  const yMax = roundUpTo(Math.max(...plotted) * 1.15, step);

  const rows: Row[] = data.map((d) => {
    const bounds = zoneBoundsFor(d.baseline);
    if (!bounds) {
      return {
        ...d,
        bandUnder: null,
        bandSteady: null,
        bandCaution: null,
        bandDanger: null,
        steadyMin: null,
        steadyMax: null,
      };
    }
    const { steadyMin, steadyMax, dangerMin } = bounds;
    return {
      ...d,
      bandUnder: steadyMin,
      bandSteady: steadyMax - steadyMin,
      bandCaution: dangerMin - steadyMax,
      bandDanger: Math.max(0, yMax - dangerMin),
      steadyMin,
      steadyMax,
    };
  });

  const BANDS = [
    { key: "bandUnder", fill: "var(--faint)", opacity: 0.06 },
    { key: "bandSteady", fill: "var(--pain-none)", opacity: 0.16 },
    { key: "bandCaution", fill: "var(--pain-elevated)", opacity: 0.16 },
    { key: "bandDanger", fill: "var(--pain-flare)", opacity: 0.16 },
  ] as const;

  return (
    <div className={fillHeight ? styles.fill : undefined}>
      {!hideLegend && (
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.legendLine} style={{ background: color }} />
            7-day average
          </span>
          <span className={styles.legendItem}>
            <span
              className={styles.legendLine}
              style={{ background: "var(--muted)", opacity: 0.7 }}
            />
            Baseline (28d)
          </span>
          <span className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ background: "var(--pain-none)", opacity: 0.4 }}
            />
            Steady range
          </span>
        </div>
      )}
      <ResponsiveContainer
        ref={containerRef}
        width="100%"
        height={fillHeight ? "100%" : 260}
        className={fillHeight ? styles.fillChart : undefined}
      >
        <ComposedChart
          data={rows}
          onClick={onChartClick}
          onTouchStart={onChartClick}
          onMouseDown={onChartClick}
          accessibilityLayer={false}
          margin={{ top: 6, right: 12, bottom: 0, left: -18 }}
        >
          <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
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
            domain={[0, yMax]}
            ticks={stepTicks(yMax, step)}
            tickFormatter={formatValue}
            interval={compact ? "preserveStart" : 0}
          />
          <Tooltip
            content={
              <ZoneTooltipContent formatValue={formatValue} unit={unit} />
            }
            cursor={{ stroke: CHART_CHROME.axisLine }}
            active={tooltipSuppressed ? false : undefined}
          />
          {/* Stacked so each band starts where the last ended; declared first so the
              lines draw on top. */}
          {BANDS.map((band) => (
            <Area
              key={band.key}
              dataKey={band.key}
              stackId="zones"
              stroke="none"
              fill={band.fill}
              fillOpacity={band.opacity}
              isAnimationActive={false}
              activeDot={false}
            />
          ))}
          <Line
            dataKey="baseline"
            name="Baseline (28d)"
            stroke="var(--muted)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            connectNulls
            isAnimationActive={!compact}
            animationBegin={0}
            animationDuration={300}
            animationEasing="linear"
          />
          <Line
            dataKey="acute"
            name="7-day average"
            stroke={color}
            strokeWidth={2.5}
            dot={false}
            connectNulls
            isAnimationActive={!compact}
            animationBegin={0}
            animationDuration={300}
            animationEasing="linear"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// Morning-to-day pain "candlestick" — one candle per day in the same OHLC
// terms as a stock chart: Open = morning pain, High/Low = the day's
// highest/lowest reading, Close = night pain (last thing before bed). Body
// color says which way the day moved: green when night pain came in below
// morning (improved), red when it came in above (worsened).
//
// Recharts has no built-in candlestick type. This draws one via a custom
// Bar `shape`: the Bar's own dataKey is the [low, high] range (a 2-tuple
// value — the same "range" convention progression-chart.tsx uses for its
// Area band — Recharts maps it to a correctly-scaled y/height for us), and
// the shape function derives the open/close body's pixel position from
// that same range by linear interpolation, since a Bar's shape prop has no
// direct access to the chart's y-scale function otherwise.
"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
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
import { painCandleTrend, type PainCandle } from "@/domain/candle";
import { EmptyState } from "@/components/ui/shared/empty-state";
import { useChartTooltipSuppression } from "./use-chart-tooltip-suppression";
import styles from "./charts.module.css";

type CandlePoint = PainCandle & { range: [number, number] };

const IMPROVED_COLOR = "var(--pain-none)";
const WORSENED_COLOR = "var(--pain-flare)";
const UNCHANGED_COLOR = "var(--faint)";

function colorFor(candle: PainCandle): string {
  const trend = painCandleTrend(candle);
  return trend === "improved"
    ? IMPROVED_COLOR
    : trend === "worsened"
      ? WORSENED_COLOR
      : UNCHANGED_COLOR;
}

// x/y/width/height describe the [low, high] range Recharts already mapped
// to pixels for this Bar (y = pixel for `high`, y+height = pixel for
// `low`); open/close pixel positions are derived from that same mapping.
function CandleShape(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: CandlePoint;
}) {
  const { x, y, width, height, payload } = props;
  if (x == null || y == null || width == null || height == null || !payload) {
    return null;
  }
  const { open, close, high, low } = payload;
  const color = colorFor(payload);

  const span = high - low;
  const valueToY = (value: number) =>
    span > 0 ? y + height * (1 - (value - low) / span) : y + height / 2;

  const openY = valueToY(open);
  const closeY = valueToY(close);
  const bodyTop = Math.min(openY, closeY);
  // Minimum 1.5px so a flat/no-change candle still reads as a visible mark
  // rather than disappearing entirely.
  const bodyHeight = Math.max(Math.abs(closeY - openY), 1.5);

  const bodyWidth = width * 0.6;
  const bodyX = x + (width - bodyWidth) / 2;
  const wickX = x + width / 2;

  return (
    <g>
      <line
        x1={wickX}
        x2={wickX}
        y1={y}
        y2={y + height}
        stroke={color}
        strokeWidth={1.5}
      />
      <rect
        x={bodyX}
        y={bodyTop}
        width={bodyWidth}
        height={bodyHeight}
        fill={color}
        rx={1}
      />
    </g>
  );
}

function CandleTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: CandlePoint }[];
}) {
  if (!active || !payload?.[0]) return null;
  const candle = payload[0].payload;
  const trend = painCandleTrend(candle);
  const trendLabel =
    trend === "improved"
      ? "Improved through the day"
      : trend === "worsened"
        ? "Worsened through the day"
        : "Unchanged through the day";
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ color: "var(--muted)", marginBottom: 4 }}>
        {candle.date}
      </div>
      <div>Morning (open): {candle.open}</div>
      <div>Peak (high): {candle.high}</div>
      <div>Lowest (low): {candle.low}</div>
      <div>Night (close): {candle.close}</div>
      <div style={{ marginTop: 4, color: colorFor(candle) }}>{trendLabel}</div>
    </div>
  );
}

export function PainCandleChart({
  data,
  autoScaleYAxis = false,
  fillHeight = false,
  compact = false,
  hideLegend = false,
}: {
  data: PainCandle[];
  // When true, the Y-axis scales to fit the visible data's own range
  // instead of the fixed 0–10 pain scale (Account → Preferences).
  autoScaleYAxis?: boolean;
  // When true, fill the parent's height instead of the fixed pixel height
  // used on /insights — see .fill in charts.module.css.
  fillHeight?: boolean;
  // Add-widget picker preview mode: lets the Y-axis drop ticks that don't
  // fit instead of forcing every one (see interval below), and skips chart
  // animation — the box is too short to spare the room, and animation on
  // ~20 previews mounting at once is what made the picker feel slow.
  compact?: boolean;
  // Independent of `compact` — trialled separately. Set via
  // WidgetRenderContext.hideLegend (see widget-preview-data.ts) rather than
  // tied to `compact`, so legend visibility can be toggled in preview
  // without touching the interval/animation behavior above.
  hideLegend?: boolean;
}) {
  const { suppressed: tooltipSuppressed, onChartClick } = useChartTooltipSuppression();

  if (data.length === 0) {
    return (
      <EmptyState message="No pain data yet" height={260} fill={fillHeight} />
    );
  }

  const points: CandlePoint[] = data.map((d) => ({
    ...d,
    range: [d.low, d.high],
  }));

  return (
    <div className={fillHeight ? styles.fill : undefined}>
      {!hideLegend && (
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ background: IMPROVED_COLOR }}
            />
            Improved (night &lt; morning)
          </span>
          <span className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ background: WORSENED_COLOR }}
            />
            Worsened (night &gt; morning)
          </span>
        </div>
      )}
      <ResponsiveContainer
        width="100%"
        height={fillHeight ? "100%" : 260}
        className={fillHeight ? styles.fillChart : undefined}
      >
        <ComposedChart
          data={points}
          onClick={onChartClick}
          margin={{ top: 8, right: 12, bottom: 4, left: -18 }}
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
            domain={autoScaleYAxis ? [0, "auto"] : [0, 10]}
            ticks={autoScaleYAxis ? undefined : [0, 2.5, 5, 7.5, 10]}
            interval={compact ? "preserveStart" : 0}
          />
          <Tooltip
            content={<CandleTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            active={tooltipSuppressed ? false : undefined}
          />
          <Bar dataKey="range" shape={CandleShape} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

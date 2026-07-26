// Multi-series scatter — several (x, y) series sharing one axis pair, each
// with its own color and legend entry. Used where one input might affect
// several outcomes at once (e.g. sleep vs morning/daytime/night pain) and
// seeing them together, on one plot, answers the question better than three
// separate charts would.
"use client";

import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_CHROME, TOOLTIP_STYLE } from "./chart-theme";
import type { PairedPoint } from "@/domain/correlation";
import styles from "./charts.module.css";

export type ScatterSeries = {
  key: string;
  label: string;
  color: string;
  points: PairedPoint[];
};

export function MultiScatter({
  series,
  xLabel,
  yLabel,
}: {
  series: ScatterSeries[];
  xLabel: string;
  yLabel: string;
}) {
  return (
    <div>
      <div className={styles.legend}>
        {series.map((s) => (
          <span key={s.key} className={styles.legendItem}>
            <span
              className={styles.legendDot}
              style={{ background: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke={CHART_CHROME.grid} />
          <XAxis
            dataKey="x"
            name={xLabel}
            type="number"
            tick={CHART_CHROME.tick}
            axisLine={{ stroke: CHART_CHROME.axisLine }}
            tickLine={false}
            label={{
              value: xLabel,
              position: "insideBottom",
              offset: -2,
              fill: "var(--faint)",
              fontSize: 11,
            }}
            height={34}
          />
          <YAxis
            dataKey="y"
            name={yLabel}
            type="number"
            domain={[0, 10]}
            ticks={[0, 2.5, 5, 7.5, 10]}
            tick={CHART_CHROME.tick}
            axisLine={false}
            tickLine={false}
            width={44}
            label={{
              value: yLabel,
              angle: -90,
              position: "insideLeft",
              offset: 4,
              fill: "var(--faint)",
              fontSize: 11,
              style: { textAnchor: "middle" },
            }}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: "var(--muted)" }}
            cursor={{ stroke: CHART_CHROME.axisLine, strokeDasharray: "3 3" }}
            // Show the day the dot belongs to alongside its value.
            formatter={(value, name) => [value, name]}
            labelFormatter={(_, payload) =>
              (payload?.[0]?.payload as PairedPoint | undefined)?.label ?? ""
            }
          />
          {series.map((s) => (
            <Scatter
              key={s.key}
              data={s.points}
              name={s.label}
              fill={s.color}
              fillOpacity={0.75}
              isAnimationActive={true}
              animationBegin={150}
              animationDuration={300}
              animationEasing="linear"
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

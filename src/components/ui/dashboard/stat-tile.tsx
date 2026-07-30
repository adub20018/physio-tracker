// Stat tile: headline number + compact delta on one line, a colored label
// beneath naming it, an icon badge marking which metric it is, and a 7-day
// sparkline showing the raw values the average was computed from — so the
// number reads as "the average of this shape" rather than a black box.
// Label, icon badge, and sparkline all share one accentColor, so the whole
// tile reads as one metric at a glance (matching that metric's color in its
// own full chart elsewhere). Direction-aware coloring: for pain, going DOWN
// is good; for steps and volume, going UP is good — the tile is told which
// via `deltaIsGood`.
import { TrendingUp } from "lucide-react";

import { TrendingDown } from "lucide-react";
import { StatSparkline } from "@/components/charts/sparklines/stat-sparkline";
import { StatSparklineArea } from "@/components/charts/sparklines/stat-sparkline-area";
import { InfoTooltip } from "@/components/ui/shared/info-tooltip";
import styles from "./stat-tile.module.css";

export type StatTileProps = {
  label: string;
  // Preformatted value ("1.2", "1,540", "—") — formatting is the caller's job.
  value: string;
  unit?: string;
  // Delta vs the previous period, already formatted ("0.4", "12%") — no
  // sign: direction is conveyed by the caret icon instead (deltaDirection).
  delta?: string | null;
  // Arithmetic direction the number moved, independent of whether that's
  // good or bad (e.g. pain falling is "down" but still shown in the good
  // color) — drives which caret icon renders.
  deltaDirection?: "up" | "down" | null;
  // Whether an increase is good ("up") or bad ("down"); styles the delta.
  deltaIsGood?: boolean | null;
  // What the delta is compared against ("vs previous month") — the caller
  // knows the comparison window, since it depends on the selected time range.
  deltaLabel?: string;
  // Optional formula/definition shown when the icon badge is hovered — for
  // numbers whose meaning isn't obvious from the label alone.
  hint?: string;
  // Badge icon naming which metric this is.
  icon: React.ReactNode;
  // This tile's identity color — the label text, icon badge, and sparkline
  // bars all use it. Should match this metric's color in its own full
  // chart elsewhere (chart-theme.ts's SERIES), so a tile and its chart
  // always mean the same thing at a glance.
  accentColor: string;
  // The last 7 days' raw values the headline average was computed from,
  // oldest first. `value` drives each bar's height (null for unlogged
  // days); `display` is the already-formatted tooltip text ("2.9/10", "Not
  // logged", …) — formatted by the caller, same as this component's own
  // value/delta props, since a function can't be passed from the server
  // page down into StatSparkline (a client component) as a prop. Omit to
  // render without a sparkline (e.g. a tile with no meaningful daily series).
  sparklineValues?: { date: string; value: number | null; display: string }[];
  // "bar" (default): discrete daily bars, most recent one highlighted —
  // reads well for counted quantities (steps, sleep hours). "area": a line
  // with the space beneath it filled, for metrics where a continuous trend
  // reads better than discrete days (average pain, physio load).
  sparklineVariant?: "bar" | "area";
};

export function StatTile({
  label,
  value,
  unit,
  delta,
  deltaDirection,
  deltaIsGood,
  deltaLabel = "vs previous period",
  hint,
  icon,
  accentColor,
  sparklineValues,
  sparklineVariant = "bar",
}: StatTileProps) {
  const badgeStyle = {
    background: `color-mix(in srgb, ${accentColor} 14%, transparent)`,
    color: accentColor,
  };

  return (
    <div className={styles.tile}>
      <div className={styles.headerRow}>
        <div className={styles.valueLine}>
          <span className={styles.value}>
            {value}
            {unit && <span className={styles.unit}> {unit}</span>}
          </span>
          {delta != null && deltaDirection && (
            <span
              className={`${styles.delta} ${
                deltaIsGood == null
                  ? ""
                  : deltaIsGood
                    ? styles.deltaGood
                    : styles.deltaBad
              }`}
              title={`${delta} ${deltaLabel}`}
            >
              {deltaDirection === "up" ? (
                <TrendingUp size={14} />
              ) : (
                <TrendingDown size={14} />
              )}
              {delta}
            </span>
          )}
        </div>
        {hint ? (
          <InfoTooltip
            text={hint}
            label={`What is ${label}?`}
            triggerClassName={styles.iconBadge}
            triggerStyle={badgeStyle}
          >
            {icon}
          </InfoTooltip>
        ) : (
          <span className={styles.iconBadge} style={badgeStyle}>
            {icon}
          </span>
        )}
      </div>

      <span className={styles.label} style={{ color: accentColor }}>
        {label}
      </span>

      {sparklineValues &&
        (sparklineVariant === "area" ? (
          <div className={styles.sparkline}>
            <StatSparklineArea values={sparklineValues} color={accentColor} />
          </div>
        ) : (
          <div className={styles.sparkline}>
            <StatSparkline values={sparklineValues} color={accentColor} />
          </div>
        ))}
    </div>
  );
}

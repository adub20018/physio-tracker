// Stat tile: headline number + delta, label, icon badge, and sparkline, all sharing one
// accentColor. Direction-aware coloring via `deltaIsGood`, since "up" is good for some metrics (steps) and bad for others (pain).
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
  // Preformatted delta ("0.4", "12%"), no sign — direction is the caret icon.
  delta?: string | null;
  // Arithmetic direction moved (independent of good/bad); drives the caret icon.
  deltaDirection?: "up" | "down" | null;
  // Whether an increase is good or bad; styles the delta color.
  deltaIsGood?: boolean | null;
  // What the delta is compared against ("vs previous month").
  deltaLabel?: string;
  // Optional formula/definition shown when the icon badge is hovered.
  hint?: string;
  // Badge icon naming which metric this is.
  icon: React.ReactNode;
  // This tile's identity color — label, badge, and sparkline all use it;
  // should match this metric's color in its own full chart (chart-theme.ts).
  accentColor: string;
  // Last 7 days' raw values behind the headline average, oldest first.
  // `display` is caller-formatted tooltip text; omit for no sparkline.
  sparklineValues?: { date: string; value: number | null; display: string }[];
  // "bar" (default): discrete daily bars. "area": filled line, for metrics
  // where a continuous trend reads better (average pain, physio load).
  sparklineVariant?: "bar" | "area";
  // Dashboard edit-mode drag/remove controls — swap for the icon badge so
  // tile height doesn't change between viewing and editing.
  actions?: React.ReactNode;
  // False in the Add-widget picker so sparklines don't all animate at once.
  animate?: boolean;
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
  actions,
  animate = true,
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
        {actions && <span className={styles.actions}>{actions}</span>}
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
            <StatSparklineArea
              values={sparklineValues}
              color={accentColor}
              animate={animate}
            />
          </div>
        ) : (
          <div className={styles.sparkline}>
            <StatSparkline
              values={sparklineValues}
              color={accentColor}
              animate={animate}
            />
          </div>
        ))}
    </div>
  );
}

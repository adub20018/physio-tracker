// Stat tile: one headline number with a label and an optional week-over-week
// delta. Direction-aware coloring: for pain, going DOWN is good; for steps
// and volume, going UP is good — the tile is told which via `goodDirection`.
import { InfoTooltip } from "@/components/ui/shared/info-tooltip";
import styles from "./stat-tile.module.css";

export type StatTileProps = {
  label: string;
  // Preformatted value ("1.2", "1,540", "—") — formatting is the caller's job.
  value: string;
  unit?: string;
  // Delta vs the previous period, already formatted ("+0.4", "−12%").
  delta?: string | null;
  // Whether an increase is good ("up") or bad ("down"); styles the delta.
  deltaIsGood?: boolean | null;
  // What the delta is compared against ("vs previous month") — the caller
  // knows the comparison window, since it depends on the selected time range.
  deltaLabel?: string;
  // Optional formula/definition shown in a "?" tooltip — for numbers whose
  // meaning isn't obvious from the label alone.
  hint?: string;
};

export function StatTile({
  label,
  value,
  unit,
  delta,
  deltaIsGood,
  deltaLabel = "vs previous period",
  hint,
}: StatTileProps) {
  return (
    <div className={styles.tile}>
      <span className={styles.label}>
        {label}
        {hint && <InfoTooltip text={hint} label={`What is ${label}?`} />}
      </span>
      <span className={styles.value}>
        {value}
        {unit && <span className={styles.unit}> {unit}</span>}
      </span>
      {delta != null && (
        <span
          className={`${styles.delta} ${
            deltaIsGood == null ? "" : deltaIsGood ? styles.deltaGood : styles.deltaBad
          }`}
        >
          {delta} {deltaLabel}
        </span>
      )}
    </div>
  );
}

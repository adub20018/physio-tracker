// Calendar heatmap — one cell per day, colored by average pain (GitHub-contribution style columns).
// Sequential single-hue red ramp matching the app's pain colors; unlogged days render as empty outlined cells.
"use client";

import { EmptyState } from "@/components/ui/shared/empty-state";
import styles from "./charts.module.css";

export type HeatmapDay = {
  date: string; // ISO YYYY-MM-DD
  avgPain: number | null; // null = not logged
};

// Sequential ramp, 5 steps: 0, mild (<1.5), noticeable (<3), flare (<4.5), severe.
const RAMP = ["#2a2325", "#57343a", "#8c4148", "#c25050", "#f87171"] as const;

function bucketColor(avgPain: number): string {
  if (avgPain <= 0) return RAMP[0];
  if (avgPain < 1.5) return RAMP[1];
  if (avgPain < 3) return RAMP[2];
  if (avgPain < 4.5) return RAMP[3];
  return RAMP[4];
}

// Monday-first weekday index (0 = Mon … 6 = Sun) without timezone drift.
function weekdayIndex(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

// Groups consecutive days into Monday-started weeks (columns). Leading days
// before the first date's weekday are padded with nulls.
function toWeeks(days: HeatmapDay[]): (HeatmapDay | null)[][] {
  const weeks: (HeatmapDay | null)[][] = [];
  let week: (HeatmapDay | null)[] = new Array(
    days.length > 0 ? weekdayIndex(days[0].date) : 0,
  ).fill(null);
  for (const day of days) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) weeks.push(week);
  return weeks;
}

export function CalendarHeatmap({ data }: { data: HeatmapDay[] }) {
  if (data.length === 0) {
    return <EmptyState message="No days logged yet" height={140} />;
  }

  const weeks = toWeeks(data);

  return (
    <div>
      <div className={styles.heatmap}>
        {weeks.map((week, wi) => (
          <div key={wi} className={styles.heatmapWeek}>
            {week.map((day, di) =>
              day == null ? (
                <span key={di} className={styles.heatmapCell} />
              ) : (
                <span
                  key={di}
                  className={`${styles.heatmapCell} ${day.avgPain == null ? styles.heatmapEmpty : ""}`}
                  style={
                    day.avgPain != null
                      ? { background: bucketColor(day.avgPain) }
                      : undefined
                  }
                  // Native tooltip carries the exact value — no color-reading needed.
                  title={`${day.date} — ${day.avgPain == null ? "not logged" : `avg pain ${day.avgPain.toFixed(1)}`}`}
                />
              ),
            )}
          </div>
        ))}
      </div>
      <div className={styles.heatmapLegend}>
        <span>0</span>
        {RAMP.map((c) => (
          <span
            key={c}
            className={styles.heatmapCell}
            style={{ background: c }}
          />
        ))}
        <span>5+ avg pain</span>
        <span style={{ marginLeft: "0.75rem" }}>
          <span
            className={`${styles.heatmapCell} ${styles.heatmapEmpty}`}
            style={{ display: "inline-block", verticalAlign: "middle" }}
          />{" "}
          not logged
        </span>
      </div>
    </div>
  );
}

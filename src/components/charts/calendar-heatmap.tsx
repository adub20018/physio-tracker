// Calendar heatmap — one cell per day, colored by average pain: the
// at-a-glance "is it getting better" view the spreadsheet color-coding was
// reaching for. Weeks run as columns (GitHub-contribution style).
//
// Color is a "good → bad" traffic-light ramp — green on symptom-free days,
// through yellow/amber, to red as pain rises to flare level — rather than
// an all-red scale, so a good week actually reads as good at a glance.
// Unlogged days are empty outlined cells, distinct from "logged, zero pain".
// The exact value is always in the native tooltip, so the color choice is
// never the only way to read a day. Pure CSS grid, no chart library.
"use client";

import styles from "./charts.module.css";

export type HeatmapDay = {
  date: string; // ISO YYYY-MM-DD
  avgPain: number | null; // null = not logged
};

// Good (green) → bad (red) ramp, 5 steps. Bucket boundaries follow the
// scale's meaning: 0, mild (<1.5), noticeable (<3), elevated (<4.5), severe.
const RAMP = ["#3f9d63", "#8fb43f", "#d9b23f", "#d9803f", "#e0554a"] as const;

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
  let week: (HeatmapDay | null)[] = new Array(days.length > 0 ? weekdayIndex(days[0].date) : 0).fill(null);
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
                  style={day.avgPain != null ? { background: bucketColor(day.avgPain) } : undefined}
                  // Native tooltip carries the exact value — no color-reading needed.
                  title={`${day.date} — ${day.avgPain == null ? "not logged" : `avg pain ${day.avgPain.toFixed(1)}`}`}
                />
              )
            )}
          </div>
        ))}
      </div>
      <div className={styles.heatmapLegend}>
        <span>No pain</span>
        {RAMP.map((c) => (
          <span key={c} className={styles.heatmapCell} style={{ background: c }} />
        ))}
        <span>Flare</span>
        <span style={{ marginLeft: "0.75rem" }}>
          <span className={`${styles.heatmapCell} ${styles.heatmapEmpty}`} style={{ display: "inline-block", verticalAlign: "middle" }} />
          {" "}not logged
        </span>
      </div>
    </div>
  );
}

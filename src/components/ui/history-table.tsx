// Client-side history table: every logged day as one calm row — date, pain
// trio (dot + value), steps with a small volume bar, condensed physio — with
// notes, tags, sleep, and exercise detail tucked into an expandable row.
// Receives a flat, display-ready row shape (HistoryRow) from the server page;
// no repository or Drizzle imports here (PLAN.md §5 dependency direction).
"use client";

import { DataTable } from "@primereact/ui/datatable";
import { SortableHeader } from "./datatable-sort-header";
import { painSeverity, type PainSeverity } from "@/domain/constants";
import styles from "./history-table.module.css";

// Display-ready view of one logged day, prepared by the server page.
export type HistoryRow = {
  id: string;
  date: string; // ISO YYYY-MM-DD
  weekday: string; // "Mon", "Tue", …
  steps: number | null;
  painMorning: number | null;
  painDaytime: number | null;
  painNight: number | null;
  sleepHours: number | null;
  exerciseSummary: string; // e.g. "Standing ankle raise 3×20s + 1×30s @25–35%"
  activityTags: string[];
  painTypes: string[];
  activityNotes: string;
  generalNotes: string;
};

// Severity bucket → the CSS custom property holding its dot color.
const SEVERITY_VAR: Record<PainSeverity, string> = {
  none: "var(--pain-none)",
  mild: "var(--pain-mild)",
  elevated: "var(--pain-elevated)",
  flare: "var(--pain-flare)",
};

// Steps bar is scaled against a typical active day rather than the max, so
// ordinary days stay readable and big days visibly cap out.
const STEPS_BAR_SCALE = 3000;

// One pain reading: slot letter, severity dot, value ("–" when unrecorded).
function PainReading({ slot, value }: { slot: string; value: number | null }) {
  return (
    <span className={styles.painReading}>
      <span className={styles.slotLetter}>{slot}</span>
      {value == null ? (
        <span className={styles.painEmpty}>–</span>
      ) : (
        <>
          <span
            className={styles.painDot}
            style={{ background: SEVERITY_VAR[painSeverity(value)] }}
          />
          {value}
        </>
      )}
    </span>
  );
}

// Expanded detail content for one day: sleep, tags, notes, full physio.
function DayDetail({ row }: { row: HistoryRow }) {
  return (
    <div className={styles.detailGrid}>
      {row.exerciseSummary && (
        <div className={styles.detailBlock}>
          <span className={styles.detailLabel}>Physio</span>
          <span className={styles.detailText}>
            <strong>{row.exerciseSummary}</strong>
          </span>
        </div>
      )}
      {(row.activityTags.length > 0 || row.sleepHours != null) && (
        <div className={styles.detailBlock}>
          <span className={styles.detailLabel}>Day</span>
          <div className={styles.tagRow}>
            {row.activityTags.map((t) => (
              <span key={t} className={styles.tag}>
                {t}
              </span>
            ))}
            {row.sleepHours != null && (
              <span className={styles.tag}>{row.sleepHours}h sleep</span>
            )}
          </div>
        </div>
      )}
      {row.painTypes.length > 0 && (
        <div className={styles.detailBlock}>
          <span className={styles.detailLabel}>Pain type</span>
          <div className={styles.tagRow}>
            {row.painTypes.map((t) => (
              <span key={t} className={styles.tag}>
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
      {row.activityNotes && (
        <div className={styles.detailBlock}>
          <span className={styles.detailLabel}>Activity</span>
          <span className={styles.detailText}>{row.activityNotes}</span>
        </div>
      )}
      {row.generalNotes && (
        <div className={styles.detailBlock}>
          <span className={styles.detailLabel}>Notes</span>
          <span className={styles.detailText}>{row.generalNotes}</span>
        </div>
      )}
    </div>
  );
}

export function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  return (
    <div className={styles.wrapper}>
      <DataTable.Root
        data={rows}
        dataKey="id"
        defaultSortField="date"
        defaultSortOrder={-1}
        removableSort
      >
        <DataTable.TableContainer>
          <DataTable.Table>
            <DataTable.THead>
              <DataTable.THeadRow>
                <DataTable.THeadCell aria-label="Expand" style={{ width: "2.5rem" }} />
                <DataTable.THeadCell>
                  <SortableHeader field="date" label="Date" />
                </DataTable.THeadCell>
                <DataTable.THeadCell>Pain · M / D / N</DataTable.THeadCell>
                <DataTable.THeadCell>
                  <SortableHeader field="steps" label="Steps" />
                </DataTable.THeadCell>
                <DataTable.THeadCell>Physio</DataTable.THeadCell>
              </DataTable.THeadRow>
            </DataTable.THead>
            <DataTable.TBody>
              {/* The library types `item` as Record<string, unknown>; we know
                  it is the HistoryRow we passed to DataTable.Root. */}
              {({ item: rawItem }) => {
                const item = rawItem as HistoryRow;
                return (
                  <>
                    <DataTable.Row>
                      <DataTable.Cell>
                        <DataTable.RowToggle className={styles.toggle} aria-label="Toggle details">
                          <DataTable.RowToggleIndicator match="collapsed">
                            ▸
                          </DataTable.RowToggleIndicator>
                          <DataTable.RowToggleIndicator match="expanded">
                            ▾
                          </DataTable.RowToggleIndicator>
                        </DataTable.RowToggle>
                      </DataTable.Cell>
                      <DataTable.Cell className={styles.date}>
                        {item.date}
                        <span className={styles.weekday}>{item.weekday}</span>
                      </DataTable.Cell>
                      <DataTable.Cell>
                        <span className={styles.painTrio}>
                          <PainReading slot="M" value={item.painMorning} />
                          <PainReading slot="D" value={item.painDaytime} />
                          <PainReading slot="N" value={item.painNight} />
                        </span>
                      </DataTable.Cell>
                      <DataTable.Cell className={styles.steps}>
                        {item.steps == null ? (
                          <span className={styles.painEmpty}>–</span>
                        ) : (
                          <>
                            <span className={styles.stepsValue}>
                              {item.steps.toLocaleString()}
                            </span>
                            <div className={styles.stepsBar}>
                              <div
                                className={styles.stepsBarFill}
                                style={{
                                  width: `${Math.min(100, (item.steps / STEPS_BAR_SCALE) * 100)}%`,
                                }}
                              />
                            </div>
                          </>
                        )}
                      </DataTable.Cell>
                      <DataTable.Cell className={styles.physio}>
                        {item.exerciseSummary || <span className={styles.painEmpty}>–</span>}
                      </DataTable.Cell>
                    </DataTable.Row>
                    <DataTable.RowExpansion className={styles.detailRow}>
                      <td colSpan={5}>
                        <DayDetail row={item} />
                      </td>
                    </DataTable.RowExpansion>
                  </>
                );
              }}
            </DataTable.TBody>
          </DataTable.Table>
        </DataTable.TableContainer>
      </DataTable.Root>
    </div>
  );
}

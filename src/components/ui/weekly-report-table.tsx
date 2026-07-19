// Weekly report card (client): one PrimeReact DataTable row per calendar
// week — days logged, average pain with week-over-week delta, steps, physio
// volume, flare count. Receives display-ready rows from the server page.
"use client";

import { DataTable } from "@primereact/ui/datatable";
import { Tag } from "@primereact/ui/tag";
import { painSeverity, type PainSeverity } from "@/domain/constants";
import styles from "./weekly-report-table.module.css";

export type WeeklyRow = {
  weekStart: string;
  weekLabel: string; // "Jul 13 – Jul 19"
  loggedDays: number;
  painAvg: number | null;
  painDelta: string | null; // "+0.4" / "−0.2" vs previous week
  painImproved: boolean | null;
  stepsAvg: number | null;
  physioVolume: number;
  flareDays: number;
};

const SEVERITY_COLOR: Record<PainSeverity, "secondary" | "success" | "warn" | "danger"> = {
  none: "secondary",
  mild: "success",
  elevated: "warn",
  flare: "danger",
};

export function WeeklyReportTable({ rows }: { rows: WeeklyRow[] }) {
  return (
    <div className={styles.wrapper}>
      <DataTable.Root data={rows} dataKey="weekStart" size="small">
        <DataTable.TableContainer>
          <DataTable.Table>
            <DataTable.THead>
              <DataTable.THeadRow>
                <DataTable.THeadCell>Week</DataTable.THeadCell>
                <DataTable.THeadCell>Days</DataTable.THeadCell>
                <DataTable.THeadCell>Avg pain</DataTable.THeadCell>
                <DataTable.THeadCell>Avg steps</DataTable.THeadCell>
                <DataTable.THeadCell>Physio vol.</DataTable.THeadCell>
                <DataTable.THeadCell>Flares</DataTable.THeadCell>
              </DataTable.THeadRow>
            </DataTable.THead>
            <DataTable.TBody>
              {/* Library types `item` loosely; it is the WeeklyRow we passed. */}
              {({ item: rawItem }) => {
                const w = rawItem as WeeklyRow;
                return (
                  <DataTable.Row>
                    <DataTable.Cell className={styles.week}>{w.weekLabel}</DataTable.Cell>
                    <DataTable.Cell className={styles.num}>{w.loggedDays}</DataTable.Cell>
                    <DataTable.Cell>
                      {w.painAvg == null ? (
                        <span className={styles.dim}>–</span>
                      ) : (
                        <span className={styles.painCell}>
                          <Tag severity={SEVERITY_COLOR[painSeverity(w.painAvg)]}>
                            {w.painAvg.toFixed(1)}
                          </Tag>
                          {w.painDelta && (
                            <span
                              className={w.painImproved ? styles.deltaGood : styles.deltaBad}
                            >
                              {w.painDelta}
                            </span>
                          )}
                        </span>
                      )}
                    </DataTable.Cell>
                    <DataTable.Cell className={styles.num}>
                      {w.stepsAvg != null ? Math.round(w.stepsAvg).toLocaleString() : "–"}
                    </DataTable.Cell>
                    <DataTable.Cell className={styles.num}>
                      {Math.round(w.physioVolume).toLocaleString()}
                    </DataTable.Cell>
                    <DataTable.Cell className={styles.num}>
                      {w.flareDays > 0 ? w.flareDays : <span className={styles.dim}>0</span>}
                    </DataTable.Cell>
                  </DataTable.Row>
                );
              }}
            </DataTable.TBody>
          </DataTable.Table>
        </DataTable.TableContainer>
      </DataTable.Root>
    </div>
  );
}

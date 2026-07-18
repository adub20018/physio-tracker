// Client-side history table: renders every daily log in a sortable
// PrimeReact DataTable. Receives a flat, display-ready row shape
// (HistoryRow) from the server page — no repository or Drizzle imports here
// (PLAN.md §5 dependency direction).
"use client";

import { DataTable } from "@primereact/ui/datatable";
import { Tag } from "@primereact/ui/tag";
import { painSeverity, type PainSeverity } from "@/domain/constants";

// Display-ready view of one logged day, prepared by the server page.
export type HistoryRow = {
  id: string;
  date: string; // ISO YYYY-MM-DD
  steps: number | null;
  painMorning: number | null;
  painDaytime: number | null;
  painNight: number | null;
  sleepHours: number | null;
  exerciseSummary: string; // e.g. "Standing ankle raise 3×20s + 1×30s @25–35%"
  activityTags: string[];
  notes: string; // activity + general notes combined
};

// Maps a pain severity bucket to a PrimeReact Tag severity color.
const SEVERITY_COLOR: Record<PainSeverity, "secondary" | "success" | "warn" | "danger"> = {
  none: "secondary",
  mild: "success",
  elevated: "warn",
  flare: "danger",
};

// A single pain reading as a color-coded badge ("—" when not recorded).
// Rendered as a string: the number 0 is a falsy React child that PrimeReact's
// Tag would otherwise drop, showing an empty badge.
function PainBadge({ value }: { value: number | null }) {
  if (value == null) return <span>—</span>;
  return <Tag severity={SEVERITY_COLOR[painSeverity(value)]}>{String(value)}</Tag>;
}

// Sortable column header with direction indicators.
function SortableHeader({ field, label }: { field: string; label: string }) {
  return (
    <DataTable.Sort field={field}>
      {label}
      <DataTable.SortIndicator match="asc"> ▲</DataTable.SortIndicator>
      <DataTable.SortIndicator match="desc"> ▼</DataTable.SortIndicator>
    </DataTable.Sort>
  );
}

export function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  return (
    <DataTable.Root
      data={rows}
      dataKey="id"
      defaultSortField="date"
      defaultSortOrder={-1}
      removableSort
      stripedRows
      size="small"
      scrollable
    >
      <DataTable.TableContainer>
        <DataTable.Table>
          <DataTable.THead>
            <DataTable.THeadRow>
              <DataTable.THeadCell>
                <SortableHeader field="date" label="Date" />
              </DataTable.THeadCell>
              <DataTable.THeadCell>
                <SortableHeader field="steps" label="Steps" />
              </DataTable.THeadCell>
              <DataTable.THeadCell>
                <SortableHeader field="painMorning" label="Morning" />
              </DataTable.THeadCell>
              <DataTable.THeadCell>
                <SortableHeader field="painDaytime" label="Daytime" />
              </DataTable.THeadCell>
              <DataTable.THeadCell>
                <SortableHeader field="painNight" label="Night" />
              </DataTable.THeadCell>
              <DataTable.THeadCell>
                <SortableHeader field="sleepHours" label="Sleep" />
              </DataTable.THeadCell>
              <DataTable.THeadCell>Physio</DataTable.THeadCell>
              <DataTable.THeadCell>Activity</DataTable.THeadCell>
              <DataTable.THeadCell>Notes</DataTable.THeadCell>
            </DataTable.THeadRow>
          </DataTable.THead>
          <DataTable.TBody>
            {/* The library types `item` as Record<string, unknown>; we know
                it is the HistoryRow we passed to DataTable.Root. */}
            {({ item: rawItem }) => {
              const item = rawItem as HistoryRow;
              return (
              <DataTable.Row>
                <DataTable.Cell style={{ whiteSpace: "nowrap" }}>{item.date}</DataTable.Cell>
                <DataTable.Cell>{item.steps ?? "—"}</DataTable.Cell>
                <DataTable.Cell>
                  <PainBadge value={item.painMorning} />
                </DataTable.Cell>
                <DataTable.Cell>
                  <PainBadge value={item.painDaytime} />
                </DataTable.Cell>
                <DataTable.Cell>
                  <PainBadge value={item.painNight} />
                </DataTable.Cell>
                <DataTable.Cell>{item.sleepHours ?? "—"}</DataTable.Cell>
                <DataTable.Cell style={{ minWidth: "14rem" }}>
                  {item.exerciseSummary || "—"}
                </DataTable.Cell>
                <DataTable.Cell style={{ whiteSpace: "nowrap" }}>
                  {item.activityTags.length > 0 ? item.activityTags.join(", ") : "—"}
                </DataTable.Cell>
                {/* Notes can be long: clamp visually, full text on hover. */}
                <DataTable.Cell style={{ minWidth: "18rem" }}>
                  <span
                    title={item.notes}
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {item.notes || "—"}
                  </span>
                </DataTable.Cell>
              </DataTable.Row>
              );
            }}
          </DataTable.TBody>
        </DataTable.Table>
      </DataTable.TableContainer>
    </DataTable.Root>
  );
}

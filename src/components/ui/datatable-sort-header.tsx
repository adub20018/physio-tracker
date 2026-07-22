// Sortable column header for PrimeReact DataTables, in the app's quiet
// uppercase header voice. Shared by the history and weekly-report tables so
// the sort affordance looks identical everywhere. Must render inside a
// DataTable.Root (it uses the table's sort context).
"use client";

import { DataTable } from "@primereact/ui/datatable";
import styles from "./datatable-sort-header.module.css";

export function SortableHeader({ field, label }: { field: string; label: string }) {
  return (
    <DataTable.Sort field={field} className={styles.sortButton}>
      {label}
      <DataTable.SortIndicator match="asc">
        <span className={styles.sortIcon}>▲</span>
      </DataTable.SortIndicator>
      <DataTable.SortIndicator match="desc">
        <span className={styles.sortIcon}>▼</span>
      </DataTable.SortIndicator>
    </DataTable.Sort>
  );
}

// Sortable column header shared by the history and weekly-report tables.
// Must render inside a DataTable.Root (uses the table's sort context).
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

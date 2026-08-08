// The dashboard's settings popover (gear button): rename, reset layout, delete.
// Time range now lives in its own toolbar button (dashboard-timerange-button.tsx);
// moving/creating dashboards is the switcher's job instead (dashboard-switcher.tsx); reset/delete confirm first.
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Popover } from "@primereact/ui/popover";
import { Button } from "@primereact/ui/button";
import { Settings, Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/shared/confirm-dialog";
import { NameDialog } from "@/components/ui/shared/name-dialog";
import type { DashboardWidget } from "@/repositories";
import {
  resetDashboardToDefault,
  renameDashboard,
  deleteDashboard,
} from "@/app/(app)/dashboard/[dashboardId]/actions";
import styles from "./dashboard-config.module.css";

export function DashboardConfig({
  dashboardId,
  dashboardName,
  // Lets the grid drop any in-progress edit draft, so a reset can't be
  // immediately overwritten by a stale Save.
  onReset,
}: {
  dashboardId: string;
  dashboardName: string;
  onReset?: (widgets: DashboardWidget[]) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirmReset() {
    setError(null);
    startTransition(async () => {
      const result = await resetDashboardToDefault(dashboardId);
      if (result.ok) {
        setResetOpen(false);
        setOpen(false);

        if (result.widgets) {
          onReset?.(result.widgets);
        }

        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function confirmRename(name: string) {
    setError(null);
    startTransition(async () => {
      const result = await renameDashboard(dashboardId, name);
      if (result.ok) {
        setRenameOpen(false);
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  // /dashboard resolves to whatever dashboard is left — or seeds a fresh
  // "Default" if this was the last one — so there's nothing to choose here.
  function confirmDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteDashboard(dashboardId);
      if (result.ok) {
        setDeleteOpen(false);
        setOpen(false);
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <Popover.Root
        open={open}
        onOpenChange={(e: { value?: boolean }) => setOpen(e.value ?? false)}
      >
        <Popover.Trigger
          as={Button}
          iconOnly
          variant="outlined"
          severity="secondary"
          size="small"
          aria-label="Dashboard settings"
        >
          <Settings size={14} />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner sideOffset={8} align="end">
            <Popover.Popup className={styles.popup}>
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Dashboard name</h3>
                <div className={styles.nameRow}>
                  <span className={styles.nameText}>{dashboardName}</span>
                  <Button
                    iconOnly
                    variant="text"
                    severity="secondary"
                    size="small"
                    aria-label="Rename dashboard"
                    onClick={() => {
                      setError(null);
                      setRenameOpen(true);
                    }}
                  >
                    <Pencil size={14} />
                  </Button>
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Layout</h3>
                <p className={styles.sectionHint}>
                  Restores the default widgets and arrangement.
                </p>
                <Button
                  severity="secondary"
                  variant="outlined"
                  size="small"
                  onClick={() => setResetOpen(true)}
                >
                  Restore default layout
                </Button>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Danger zone</h3>
                <p className={styles.sectionHint}>
                  Permanently deletes this dashboard and its layout.
                </p>
                <Button
                  severity="danger"
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setError(null);
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2 size={14} /> Delete dashboard
                </Button>
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset this dashboard?"
        description="This dashboard's widgets and layout will be replaced with the default set. Any widgets you've added, removed, moved, or resized here will be lost. Your logged data isn't affected."
        confirmLabel="Reset dashboard"
        pendingLabel="Resetting…"
        onConfirm={confirmReset}
        isPending={isPending}
        error={error}
      />

      <NameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title="Rename dashboard"
        label="Name"
        initialValue={dashboardName}
        confirmLabel="Save name"
        pendingLabel="Saving…"
        onConfirm={confirmRename}
        isPending={isPending}
        error={error}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${dashboardName}"?`}
        description="This dashboard and its widget layout will be deleted. Your logged data isn't affected, and the same charts are still available on any other dashboard."
        confirmLabel="Delete dashboard"
        pendingLabel="Deleting…"
        onConfirm={confirmDelete}
        isPending={isPending}
        error={error}
      />
    </>
  );
}

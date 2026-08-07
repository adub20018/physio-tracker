// The dashboard's settings menu (gear button): rename, reset layout, delete.
// Time range now lives in its own toolbar button (dashboard-timerange-button.tsx);
// moving/creating dashboards is the switcher's job instead (dashboard-switcher.tsx).
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "@primereact/ui/menu";
import { Button } from "@primereact/ui/button";
import { Settings, Pencil, RotateCcw, Trash2 } from "lucide-react";
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
      <Menu.Root
        open={open}
        onOpenChange={(e: { value?: boolean }) => setOpen(e.value ?? false)}
      >
        <Menu.Trigger
          as={Button}
          iconOnly
          variant="outlined"
          severity="secondary"
          size="small"
          aria-label="Dashboard settings"
        >
          <Settings size={14} />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={8} align="end">
            <Menu.Popup className={styles.popup}>
              <Menu.List>
                <Menu.Item
                  onSelect={() => {
                    setError(null);
                    setRenameOpen(true);
                  }}
                >
                  <Pencil size={14} /> Rename dashboard
                </Menu.Item>
                <Menu.Separator />
                <Menu.Item
                  onSelect={() => {
                    setError(null);
                    setResetOpen(true);
                  }}
                >
                  <RotateCcw size={14} /> Restore default layout
                </Menu.Item>
                <Menu.Separator />
                <Menu.Item
                  className={styles.dangerItem}
                  onSelect={() => {
                    setError(null);
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2 size={14} /> Delete dashboard
                </Menu.Item>
              </Menu.List>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

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

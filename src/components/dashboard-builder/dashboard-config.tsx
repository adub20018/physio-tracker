// The dashboard's settings popover — the gear button at the top right of a
// dashboard. Holds the time range every range-dependent widget on this
// dashboard reads from, and the "reset to default" escape hatch for a
// layout that's been customized into a mess.
//
// Reset is destructive (it discards the user's arrangement), so it goes
// through the shared ConfirmDialog rather than firing straight off a click.
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Popover } from "@primereact/ui/popover";
import { Button } from "@primereact/ui/button";
import { Settings } from "lucide-react";
import { TimeRangeSelector } from "@/components/ui/shared/time-range-selector";
import { ConfirmDialog } from "@/components/ui/shared/confirm-dialog";
import type { TimeRange } from "@/lib/time-range";
import { resetDashboardToDefault } from "@/app/(app)/dashboard/[dashboardId]/actions";
import styles from "./dashboard-config.module.css";

export function DashboardConfig({
  dashboardId,
  range,
  onRangeChange,
  onReset,
}: {
  dashboardId: string;
  range: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  // Lets the grid drop any in-progress edit draft, so a reset can't be
  // immediately overwritten by a stale Save.
  onReset?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirmReset() {
    setError(null);
    startTransition(async () => {
      const result = await resetDashboardToDefault(dashboardId);
      if (result.ok) {
        setConfirmOpen(false);
        setOpen(false);
        onReset?.();
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
                <h3 className={styles.sectionTitle}>Time range</h3>
                <TimeRangeSelector value={range} onChange={onRangeChange} />
                <p className={styles.sectionHint}>
                  Applies to every chart on this dashboard. Stat tiles always
                  show the last 7 days, and the calendar always shows your full
                  history.
                </p>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Layout</h3>
                <p className={styles.sectionHint}>
                  Restore the standard set of widgets and their original
                  arrangement.
                </p>
                <Button
                  severity="secondary"
                  variant="outlined"
                  size="small"
                  onClick={() => setConfirmOpen(true)}
                >
                  Reset to default dashboard
                </Button>
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Reset this dashboard?"
        description="This dashboard's widgets and layout will be replaced with the default set. Any widgets you've added, removed, moved, or resized here will be lost. Your logged data isn't affected."
        confirmLabel="Reset dashboard"
        pendingLabel="Resetting…"
        onConfirm={confirmReset}
        isPending={isPending}
        error={error}
      />
    </>
  );
}

// Chart auto-scale toggle for /account/preferences. Saves immediately on
// change — unlike AppConfigForm's flare-threshold field, a switch reads as
// an instant on/off action, not something that needs a separate "Save"
// click to take effect.
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@primereact/ui/label";
import { ToggleSwitch } from "@primereact/ui/toggleswitch";
import { saveChartAutoScaleYAxis } from "@/app/(app)/account/preferences/actions";
import styles from "./account-form.module.css";

export function ChartAutoScaleToggle({
  initialValue,
}: {
  initialValue: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [checked, setChecked] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  function toggle(next: boolean) {
    setChecked(next);
    setError(null);
    startTransition(async () => {
      const result = await saveChartAutoScaleYAxis(next);
      if (result.ok) {
        router.refresh();
      } else {
        setChecked(!next);
        setError(result.error);
      }
    });
  }

  return (
    <div className={styles.card}>
      <div className={styles.toggleRow}>
        <div className={styles.field}>
          <Label htmlFor="chart-auto-scale" className={styles.fieldLabel}>
            Auto-scale chart Y-axis
          </Label>
          <span className={styles.hint}>
            Fit each chart&apos;s Y-axis to the visible data instead of a fixed range.
          </span>
        </div>
        <ToggleSwitch.Root
          inputId="chart-auto-scale"
          checked={checked}
          disabled={isPending}
          onCheckedChange={(e: { checked: boolean }) => toggle(e.checked)}
        >
          <ToggleSwitch.Control>
            <ToggleSwitch.Handle />
          </ToggleSwitch.Control>
        </ToggleSwitch.Root>
      </div>
      {error && <span className={styles.fieldError}>{error}</span>}
    </div>
  );
}

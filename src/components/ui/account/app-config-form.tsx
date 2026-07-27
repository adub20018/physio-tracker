// App Settings form for /account/preferences. Currently just the flare
// threshold, but the form/action split (one field here, one server action
// per setting) is meant to extend cleanly as more configurable settings
// are added.
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@primereact/ui/label";
import { Button } from "@primereact/ui/button";
import { Message } from "@primereact/ui/message";
import { NumberField } from "@/components/ui/log/log-fields";
import { PAIN_SCALE_MAX, PAIN_SCALE_MIN, PAIN_SCALE_STEP } from "@/domain/constants";
import { saveFlareThreshold } from "@/app/(app)/account/preferences/actions";
import styles from "./account-form.module.css";

export function AppConfigForm({
  initialFlareThreshold,
}: {
  initialFlareThreshold: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [flareThreshold, setFlareThreshold] = useState<number | null>(
    initialFlareThreshold,
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (flareThreshold == null) {
      setError("Enter a value.");
      setSaved(false);
      return;
    }
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveFlareThreshold(flareThreshold);
      if (result.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form className={styles.card} onSubmit={save}>
      <div className={styles.field}>
        <Label htmlFor="flare-threshold" className={styles.fieldLabel}>
          Flare pain threshold
        </Label>
        <NumberField
          id="flare-threshold"
          value={flareThreshold}
          onChange={(v) => {
            setFlareThreshold(v);
            setError(null);
            setSaved(false);
          }}
          min={PAIN_SCALE_MIN}
          max={PAIN_SCALE_MAX}
          step={PAIN_SCALE_STEP}
          maxFractionDigits={1}
        />
        <span className={styles.hint}>
          A pain reading at or above this value counts as a flare, out of{" "}
          {PAIN_SCALE_MAX}.
        </span>
      </div>
      <div className={styles.actions}>
        {error && <span className={styles.fieldError}>{error}</span>}
        {saved && !error && (
          <Message.Root severity="success" size="small">
            <Message.Content>
              <Message.Text>Saved.</Message.Text>
            </Message.Content>
          </Message.Root>
        )}
        <Button type="submit" disabled={isPending} fluid size="large" severity="contrast">
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

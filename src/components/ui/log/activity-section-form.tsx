// The Activity section's own small form — steps, sleep, and activity tags
// for one date. Saves through its own action and returns to the /log
// overview, leaving every other section's data untouched.
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@primereact/ui/button";
import { Label } from "@primereact/ui/label";
import { Message } from "@primereact/ui/message";
import { WavePulse } from "@primeicons/react/wave-pulse";
import { Moon } from "@primeicons/react/moon";
import { ACTIVITY_TAGS } from "@/db/schema";
import { NumberField, TagMultiSelect } from "./log-fields";
import { saveActivitySection } from "@/app/(app)/log/actions";
import type { SaveResult } from "@/app/(app)/log/actions";
import type { ActivitySectionValues } from "@/app/(app)/log/schema";
import { ButtonSpinner } from "@/components/ui/shared/button-spinner";
import styles from "./log-shared.module.css";

export type ActivitySectionInit = {
  date: string;
  steps: number | null;
  sleepHours: number | null;
  activityTags: string[];
};

export function ActivitySectionForm({ init }: { init: ActivitySectionInit }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SaveResult | null>(null);

  const [steps, setSteps] = useState<number | null>(init.steps);
  const [sleepHours, setSleepHours] = useState<number | null>(init.sleepHours);
  const [activityTags, setActivityTags] = useState<string[]>(init.activityTags);

  function submit() {
    const payload: ActivitySectionValues = {
      date: init.date,
      steps,
      sleepHours,
      activityTags,
    };
    startTransition(async () => {
      const res = await saveActivitySection(payload);
      if (res.ok) {
        router.push(`/log?date=${res.date}`);
      } else {
        setResult(res);
      }
    });
  }

  return (
    <div className={styles.form}>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Activity</h2>
        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <Label htmlFor="log-steps" className={styles.fieldLabel}>
              <WavePulse size={14} /> Steps
            </Label>
            <NumberField
              id="log-steps"
              value={steps}
              onChange={setSteps}
              min={0}
              useGrouping
              placeholder="e.g. 1500"
            />
          </div>
          <div className={styles.field}>
            <Label htmlFor="log-sleep" className={styles.fieldLabel}>
              <Moon size={14} /> Sleep (hours)
            </Label>
            <NumberField
              id="log-sleep"
              value={sleepHours}
              onChange={setSleepHours}
              min={0}
              max={24}
              step={0.5}
              maxFractionDigits={1}
              placeholder="e.g. 7.5"
            />
          </div>
        </div>
        <div className={styles.subsection}>
          <span className={styles.fieldLabel}>Activity type</span>
          <TagMultiSelect
            value={activityTags}
            options={ACTIVITY_TAGS}
            onChange={setActivityTags}
            customPlaceholder="Custom activity…"
          />
        </div>
      </section>

      <div className={styles.actions}>
        <Button onClick={submit} disabled={isPending} fluid size="large" severity="contrast">
          {isPending ? (
            <>
              <ButtonSpinner />
              Saving…
            </>
          ) : (
            "Save"
          )}
        </Button>
        {result && !result.ok && (
          <Message.Root severity="error" size="small">
            <Message.Content>
              <Message.Text>{result.errors.join(" · ")}</Message.Text>
            </Message.Content>
          </Message.Root>
        )}
      </div>
    </div>
  );
}

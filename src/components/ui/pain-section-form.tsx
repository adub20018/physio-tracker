// The Pain section's own small form — readings + character for one date.
// Saves through its own action and returns to the /log overview, leaving
// every other section's data untouched (PLAN.md §5: talks to the server
// only through the action, never imports repositories directly).
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@primereact/ui/button";
import { Message } from "@primereact/ui/message";
import { PAIN_TYPES } from "@/db/schema";
import { PainInput, TagMultiSelect } from "./log-fields";
import { savePainSection } from "@/app/log/actions";
import type { SaveResult } from "@/app/log/actions";
import type { PainSectionValues } from "@/app/log/schema";
import styles from "./log-shared.module.css";

export type PainSectionInit = {
  date: string;
  painMorning: number | null;
  painDaytime: number | null;
  painNight: number | null;
  painTypes: string[];
};

export function PainSectionForm({ init }: { init: PainSectionInit }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SaveResult | null>(null);

  const [painMorning, setPainMorning] = useState(init.painMorning);
  const [painDaytime, setPainDaytime] = useState(init.painDaytime);
  const [painNight, setPainNight] = useState(init.painNight);
  const [painTypes, setPainTypes] = useState<string[]>(init.painTypes);

  function submit() {
    const payload: PainSectionValues = {
      date: init.date,
      painMorning,
      painDaytime,
      painNight,
      painTypes,
    };
    startTransition(async () => {
      const res = await savePainSection(payload);
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
        <h2 className={styles.cardTitle}>Pain</h2>
        <span className={styles.fieldLabel}>Pain level (0–10)</span>
        <PainInput label="Morning" value={painMorning} onChange={setPainMorning} />
        <PainInput label="Daytime" value={painDaytime} onChange={setPainDaytime} />
        <PainInput label="Night" value={painNight} onChange={setPainNight} />
        <div className={styles.subsection}>
          <span className={styles.fieldLabel}>Pain type</span>
          <TagMultiSelect
            value={painTypes}
            options={PAIN_TYPES}
            onChange={setPainTypes}
            customPlaceholder="Custom pain type…"
          />
        </div>
      </section>

      <div className={styles.actions}>
        <Button onClick={submit} disabled={isPending} fluid size="large" severity="contrast">
          {isPending ? "Saving…" : "Save"}
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

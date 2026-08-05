// The Notes section's own small form — general notes for one date. Saves
// through its own action and returns to the /log overview.
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@primereact/ui/button";
import { Label } from "@primereact/ui/label";
import { Textarea } from "@primereact/ui/textarea";
import { Message } from "@primereact/ui/message";
import { saveNotesSection } from "@/app/(app)/log/actions";
import type { SaveResult } from "@/app/(app)/log/actions";
import type { NotesSectionValues } from "@/app/(app)/log/schema";
import { ButtonSpinner } from "@/components/ui/shared/button-spinner";
import styles from "./log-shared.module.css";

export type NotesSectionInit = {
  date: string;
  generalNotes: string;
};

export function NotesSectionForm({ init }: { init: NotesSectionInit }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SaveResult | null>(null);

  const [generalNotes, setGeneralNotes] = useState(init.generalNotes);

  function submit() {
    const payload: NotesSectionValues = {
      date: init.date,
      generalNotes: generalNotes.trim() === "" ? null : generalNotes,
    };
    startTransition(async () => {
      const res = await saveNotesSection(payload);
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
        <h2 className={styles.cardTitle}>Notes</h2>
        <div className={styles.field}>
          <Label htmlFor="log-general-notes" className={styles.fieldLabel}>
            General notes
          </Label>
          <Textarea
            id="log-general-notes"
            rows={4}
            className={styles.input}
            placeholder="Anything worth remembering about today's symptoms"
            value={generalNotes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setGeneralNotes(e.target.value)
            }
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

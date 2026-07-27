// The Physio exercises section's own small form — the add/remove exercise
// list for one date. Saves through its own action and returns to the /log
// overview, leaving every other section's data untouched.
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@primereact/ui/button";
import { Label } from "@primereact/ui/label";
import { Textarea } from "@primereact/ui/textarea";
import { ToggleButton } from "@primereact/ui/togglebutton";
import { ToggleButtonGroup } from "@primereact/ui/togglebuttongroup";
import { Message } from "@primereact/ui/message";
import {
  ExerciseNameInput,
  NumberField,
  BLANK_EXERCISE,
  type ExerciseDraft,
} from "./log-fields";
import { savePhysioSection } from "@/app/(app)/log/actions";
import type { SaveResult } from "@/app/(app)/log/actions";
import type { PhysioSectionValues } from "@/app/(app)/log/schema";
import { ButtonSpinner } from "@/components/ui/shared/button-spinner";
import styles from "./log-shared.module.css";

export type PhysioSectionInit = {
  date: string;
  exercises: ExerciseDraft[];
  knownExerciseNames: string[]; // autocomplete suggestions
};

export function PhysioSectionForm({ init }: { init: PhysioSectionInit }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SaveResult | null>(null);
  const [exercises, setExercises] = useState<ExerciseDraft[]>(init.exercises);

  function updateExercise(index: number, patch: Partial<ExerciseDraft>) {
    setExercises((list) =>
      list.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)),
    );
  }

  function submit() {
    const payload: PhysioSectionValues = {
      date: init.date,
      exercises: exercises
        // Rows left completely blank are dropped rather than rejected.
        .filter((ex) => ex.exerciseName.trim() !== "")
        .map((ex) => ({
          exerciseName: ex.exerciseName,
          sets: ex.sets ?? 0,
          durationOrReps: ex.durationOrReps ?? 0,
          unit: ex.unit,
          intensityMin: ex.intensityMin,
          intensityMax: ex.intensityMax,
          notes: ex.notes.trim() === "" ? null : ex.notes,
        })),
    };
    startTransition(async () => {
      const res = await savePhysioSection(payload);
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
        <h2 className={styles.cardTitle}>Physio exercises</h2>
        {exercises.map((ex, i) => (
          <div key={i} className={styles.exerciseCard}>
            <div className={styles.exerciseHeader}>
              <ExerciseNameInput
                value={ex.exerciseName}
                suggestions={init.knownExerciseNames}
                onChange={(name) => updateExercise(i, { exerciseName: name })}
              />
              <Button
                size="small"
                severity="danger"
                variant="text"
                onClick={() =>
                  setExercises((list) => list.filter((_, j) => j !== i))
                }
              >
                Remove
              </Button>
            </div>
            <div className={styles.exerciseGrid}>
              <div className={styles.field}>
                <Label className={styles.fieldLabel}>Sets</Label>
                <NumberField
                  value={ex.sets}
                  onChange={(v) => updateExercise(i, { sets: v })}
                  min={1}
                  max={99}
                />
              </div>
              <div className={styles.field}>
                <Label className={styles.fieldLabel}>
                  {ex.unit === "seconds" ? "Hold (seconds)" : "Reps"}
                </Label>
                <NumberField
                  value={ex.durationOrReps}
                  onChange={(v) => updateExercise(i, { durationOrReps: v })}
                  min={1}
                  max={999}
                />
              </div>
              <div className={styles.field}>
                <Label className={styles.fieldLabel}>Intensity min %</Label>
                <NumberField
                  value={ex.intensityMin}
                  onChange={(v) => updateExercise(i, { intensityMin: v })}
                  min={0}
                  max={100}
                />
              </div>
              <div className={styles.field}>
                <Label className={styles.fieldLabel}>Intensity max %</Label>
                <NumberField
                  value={ex.intensityMax}
                  onChange={(v) => updateExercise(i, { intensityMax: v })}
                  min={0}
                  max={100}
                />
              </div>
            </div>
            <ToggleButtonGroup
              value={ex.unit}
              allowEmpty={false}
              onValueChange={(e: { value?: unknown }) =>
                updateExercise(i, { unit: e.value as "seconds" | "reps" })
              }
            >
              <ToggleButton.Root value="seconds">
                <ToggleButton.Indicator>Timed hold</ToggleButton.Indicator>
              </ToggleButton.Root>
              <ToggleButton.Root value="reps">
                <ToggleButton.Indicator>Reps</ToggleButton.Indicator>
              </ToggleButton.Root>
            </ToggleButtonGroup>
            <div className={styles.field}>
              <Label className={styles.fieldLabel}>Additional comments</Label>
              <Textarea
                rows={2}
                className={styles.input}
                placeholder="e.g. Last set felt harder than usual"
                value={ex.notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  updateExercise(i, { notes: e.target.value })
                }
              />
            </div>
          </div>
        ))}
        <Button
          size="small"
          severity="secondary"
          onClick={() =>
            setExercises((list) => [...list, { ...BLANK_EXERCISE }])
          }
        >
          + Add exercise
        </Button>
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

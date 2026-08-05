// The Physio exercises section's own small form — saves via its own action, other sections untouched.
// Every row must be fully valid to save (no silent "drop incomplete rows" fallback); remove unwanted rows via the trash button.
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@primereact/ui/button";
import { Label } from "@primereact/ui/label";
import { Textarea } from "@primereact/ui/textarea";
import { ToggleButton } from "@primereact/ui/togglebutton";
import { ToggleButtonGroup } from "@primereact/ui/togglebuttongroup";
import { Message } from "@primereact/ui/message";
import { Trash2 } from "lucide-react";
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

// Per-row validation messages, indexed the same as the exercises array. Intensity min/max are
// intentionally never required — logging just one side (e.g. a single 20% reading) is valid, not partial.
type ExerciseFieldErrors = {
  exerciseName?: string;
  sets?: string;
  durationOrReps?: string;
  intensityMin?: string;
};

function validateExercises(exercises: ExerciseDraft[]): ExerciseFieldErrors[] {
  return exercises.map((ex) => {
    const errors: ExerciseFieldErrors = {};
    if (ex.exerciseName.trim() === "") {
      errors.exerciseName = "Exercise name is required.";
    }
    if (ex.sets == null) errors.sets = "Required.";
    if (ex.durationOrReps == null) errors.durationOrReps = "Required.";
    if (
      ex.intensityMin != null &&
      ex.intensityMax != null &&
      ex.intensityMin > ex.intensityMax
    ) {
      errors.intensityMin = "Min must be ≤ max.";
    }
    return errors;
  });
}

export function PhysioSectionForm({ init }: { init: PhysioSectionInit }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SaveResult | null>(null);
  const [exercises, setExercises] = useState<ExerciseDraft[]>(init.exercises);
  const [exerciseErrors, setExerciseErrors] = useState<ExerciseFieldErrors[]>(
    [],
  );

  function updateExercise(index: number, patch: Partial<ExerciseDraft>) {
    setExercises((list) =>
      list.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)),
    );
    // Clear only the fields just edited, same as the login/sign-up forms —
    // an error the user hasn't addressed yet should keep showing.
    setExerciseErrors((errs) =>
      errs.map((err, i) => {
        if (i !== index) return err;
        const next = { ...err };
        if ("exerciseName" in patch) delete next.exerciseName;
        if ("sets" in patch) delete next.sets;
        if ("durationOrReps" in patch) delete next.durationOrReps;
        if ("intensityMin" in patch || "intensityMax" in patch) {
          delete next.intensityMin;
        }
        return next;
      }),
    );
  }

  function addExercise() {
    setExercises((list) => [...list, { ...BLANK_EXERCISE }]);
    setExerciseErrors((errs) => [...errs, {}]);
  }

  function removeExercise(index: number) {
    setExercises((list) => list.filter((_, j) => j !== index));
    setExerciseErrors((errs) => errs.filter((_, j) => j !== index));
  }

  function submit() {
    const fieldErrors = validateExercises(exercises);
    if (fieldErrors.some((err) => Object.keys(err).length > 0)) {
      setExerciseErrors(fieldErrors);
      setResult(null);
      return;
    }

    const payload: PhysioSectionValues = {
      date: init.date,
      exercises: exercises.map((ex) => ({
        exerciseName: ex.exerciseName,
        // Validated above — non-null by this point.
        sets: ex.sets!,
        durationOrReps: ex.durationOrReps!,
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
        {exercises.map((ex, i) => {
          const err = exerciseErrors[i] ?? {};
          return (
            <div key={i} className={styles.exerciseCard}>
              <div className={styles.exerciseHeader}>
                <div className={styles.field}>
                  <ExerciseNameInput
                    value={ex.exerciseName}
                    suggestions={init.knownExerciseNames}
                    onChange={(name) =>
                      updateExercise(i, { exerciseName: name })
                    }
                    invalid={!!err.exerciseName}
                  />
                  {err.exerciseName && (
                    <span className={styles.fieldError}>
                      {err.exerciseName}
                    </span>
                  )}
                </div>
                <Button
                  size="small"
                  severity="danger"
                  variant="text"
                  onClick={() => removeExercise(i)}
                >
                  <Trash2 size={24} />
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
                    invalid={!!err.sets}
                  />
                  {err.sets && (
                    <span className={styles.fieldError}>{err.sets}</span>
                  )}
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
                    invalid={!!err.durationOrReps}
                  />
                  {err.durationOrReps && (
                    <span className={styles.fieldError}>
                      {err.durationOrReps}
                    </span>
                  )}
                </div>
                <div className={styles.field}>
                  <Label className={styles.fieldLabel}>Intensity min %</Label>
                  <NumberField
                    value={ex.intensityMin}
                    onChange={(v) => updateExercise(i, { intensityMin: v })}
                    min={0}
                    max={100}
                    invalid={!!err.intensityMin}
                  />
                  {err.intensityMin && (
                    <span className={styles.fieldError}>
                      {err.intensityMin}
                    </span>
                  )}
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
                fluid
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
          );
        })}
        <Button size="small" severity="secondary" onClick={addExercise}>
          + Add exercise
        </Button>
      </section>

      <div className={styles.actions}>
        <Button
          onClick={submit}
          disabled={isPending}
          fluid
          size="large"
          severity="contrast"
        >
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

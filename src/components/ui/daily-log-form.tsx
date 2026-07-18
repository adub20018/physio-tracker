// The daily log entry form (client component) — the app's core 30-second
// habit, optimised for phone use. Holds all form state locally, submits a
// typed payload to the saveDailyLog server action, and navigates by date so
// past days can be edited with the same form.
//
// Receives display-ready initial values from the server page; talks to the
// server only through the action (never imports repositories — PLAN.md §5).
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@primereact/ui/button";
import { InputText } from "@primereact/ui/inputtext";
import { Textarea } from "@primereact/ui/textarea";
import { Slider } from "@primereact/ui/slider";
import { ToggleButton } from "@primereact/ui/togglebutton";
import { ToggleButtonGroup } from "@primereact/ui/togglebuttongroup";
import { ACTIVITY_TAGS, PAIN_TYPES, type ActivityTag, type PainType } from "@/db/schema";
import { PAIN_SCALE_MAX, PAIN_SCALE_MIN, PAIN_SCALE_STEP } from "@/domain/constants";
import { saveDailyLog, type SaveResult } from "@/app/log/actions";
import type { DailyLogFormValues } from "@/app/log/schema";
import styles from "./daily-log-form.module.css";

// One exercise row in the form; numbers kept as strings while editing so the
// user can clear a field without it snapping to 0. Parsed on submit.
type ExerciseDraft = {
  exerciseName: string;
  sets: string;
  durationOrReps: string;
  unit: "seconds" | "reps";
  intensityMin: string;
  intensityMax: string;
  notes: string;
};

export type DailyLogFormInit = {
  date: string;
  isExisting: boolean; // whether this date already has a saved log
  steps: number | null;
  painMorning: number | null;
  painDaytime: number | null;
  painNight: number | null;
  sleepHours: number | null;
  activityTags: ActivityTag[];
  painTypes: PainType[];
  activityNotes: string;
  generalNotes: string;
  exercises: ExerciseDraft[];
  knownExerciseNames: string[]; // for the datalist autocomplete
};

// Empty exercise row used by the "Add exercise" button.
const BLANK_EXERCISE: ExerciseDraft = {
  exerciseName: "",
  sets: "3",
  durationOrReps: "20",
  unit: "seconds",
  intensityMin: "",
  intensityMax: "",
  notes: "",
};

// "" → null, otherwise the parsed number (invalid text also becomes null so
// zod reports a clear error instead of NaN weirdness).
function numOrNull(text: string): number | null {
  if (text.trim() === "") return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

// A single labelled pain slider with its value readout and a clear control.
// null means "not recorded" and renders as an em dash.
function PainInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className={styles.painRow}>
      <div className={styles.painHeader}>
        <span className={styles.sectionLabel}>{label}</span>
        <span>{value ?? "—"}{value != null && " / 10"}</span>
      </div>
      <div className={styles.painControls}>
        <div className={styles.painSlider}>
          <Slider.Root
            min={PAIN_SCALE_MIN}
            max={PAIN_SCALE_MAX}
            step={PAIN_SCALE_STEP}
            value={value ?? 0}
            onValueChange={(e: { value: number | number[] | undefined }) => {
              const v = Array.isArray(e.value) ? e.value[0] : e.value;
              if (v != null) onChange(v);
            }}
          >
            <Slider.Track>
              <Slider.Range />
            </Slider.Track>
            <Slider.Handle aria-label={`${label} pain`} />
          </Slider.Root>
        </div>
        <Button size="small" severity="secondary" variant="text" onClick={() => onChange(null)}>
          Clear
        </Button>
      </div>
    </div>
  );
}

export function DailyLogForm({ init }: { init: DailyLogFormInit }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SaveResult | null>(null);

  // Form state, seeded from the server-provided initial values.
  const [steps, setSteps] = useState(init.steps?.toString() ?? "");
  const [painMorning, setPainMorning] = useState(init.painMorning);
  const [painDaytime, setPainDaytime] = useState(init.painDaytime);
  const [painNight, setPainNight] = useState(init.painNight);
  const [sleepHours, setSleepHours] = useState(init.sleepHours?.toString() ?? "");
  const [activityTags, setActivityTags] = useState<ActivityTag[]>(init.activityTags);
  const [painTypes, setPainTypes] = useState<PainType[]>(init.painTypes);
  const [activityNotes, setActivityNotes] = useState(init.activityNotes);
  const [generalNotes, setGeneralNotes] = useState(init.generalNotes);
  const [exercises, setExercises] = useState<ExerciseDraft[]>(init.exercises);

  // Editing a different day = navigating to it; the server page reloads the
  // form with that day's data (or a fresh prefill).
  function changeDate(newDate: string) {
    if (newDate) router.push(`/log?date=${newDate}`);
  }

  function updateExercise(index: number, patch: Partial<ExerciseDraft>) {
    setExercises((list) => list.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)));
  }

  function submit() {
    // Assemble the typed payload the server action validates with zod.
    const payload: DailyLogFormValues = {
      date: init.date,
      steps: numOrNull(steps) as number | null,
      painMorning,
      painDaytime,
      painNight,
      sleepHours: numOrNull(sleepHours),
      activityTags,
      painTypes,
      activityNotes: activityNotes.trim() === "" ? null : activityNotes,
      generalNotes: generalNotes.trim() === "" ? null : generalNotes,
      exercises: exercises
        // Rows left completely blank are dropped rather than rejected.
        .filter((ex) => ex.exerciseName.trim() !== "")
        .map((ex) => ({
          exerciseName: ex.exerciseName,
          sets: numOrNull(ex.sets) ?? 0,
          durationOrReps: numOrNull(ex.durationOrReps) ?? 0,
          unit: ex.unit,
          intensityMin: numOrNull(ex.intensityMin),
          intensityMax: numOrNull(ex.intensityMax),
          notes: ex.notes.trim() === "" ? null : ex.notes,
        })),
    };

    startTransition(async () => {
      const res = await saveDailyLog(payload);
      setResult(res);
    });
  }

  return (
    <div className={styles.form}>
      {/* Date being logged; native date input = the OS date picker on phones */}
      <div className={styles.section}>
        <label className={styles.sectionLabel} htmlFor="log-date">Date</label>
        <InputText
          id="log-date"
          type="date"
          className={styles.input}
          defaultValue={init.date}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => changeDate(e.target.value)}
        />
        <span className={styles.hint}>
          {init.isExisting
            ? "This day already has a log — saving will update it."
            : "New day — exercises are prefilled from your last session."}
        </span>
      </div>

      {/* Pain readings */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>Pain (0–10)</span>
        <PainInput label="Morning" value={painMorning} onChange={setPainMorning} />
        <PainInput label="Daytime" value={painDaytime} onChange={setPainDaytime} />
        <PainInput label="Night" value={painNight} onChange={setPainNight} />
      </div>

      {/* Pain character tags (optional) */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>Pain type</span>
        <ToggleButtonGroup
          multiple
          allowEmpty
          value={painTypes}
          onValueChange={(e: { value?: unknown }) => setPainTypes((e.value ?? []) as PainType[])}
        >
          {PAIN_TYPES.map((t) => (
            <ToggleButton.Root key={t} value={t} size="small">
              {t}
            </ToggleButton.Root>
          ))}
        </ToggleButtonGroup>
      </div>

      {/* Steps + sleep */}
      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <label className={styles.sectionLabel} htmlFor="log-steps">Steps</label>
          <InputText
            id="log-steps"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="e.g. 1500"
            className={styles.input}
            value={steps}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSteps(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.sectionLabel} htmlFor="log-sleep">Sleep (hours)</label>
          <InputText
            id="log-sleep"
            type="number"
            inputMode="decimal"
            min={0}
            max={24}
            step={0.5}
            placeholder="e.g. 7.5"
            className={styles.input}
            value={sleepHours}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSleepHours(e.target.value)}
          />
        </div>
      </div>

      {/* Activity tags */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>Activity</span>
        <ToggleButtonGroup
          multiple
          allowEmpty
          value={activityTags}
          onValueChange={(e: { value?: unknown }) => setActivityTags((e.value ?? []) as ActivityTag[])}
        >
          {ACTIVITY_TAGS.map((t) => (
            <ToggleButton.Root key={t} value={t} size="small">
              {t}
            </ToggleButton.Root>
          ))}
        </ToggleButtonGroup>
      </div>

      {/* Physio exercises */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>Physio exercises</span>
        {exercises.map((ex, i) => (
          <div key={i} className={styles.exerciseCard}>
            <div className={styles.exerciseHeader}>
              <InputText
                aria-label="Exercise name"
                placeholder="Exercise name"
                list="known-exercises"
                className={styles.input}
                value={ex.exerciseName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateExercise(i, { exerciseName: e.target.value })
                }
              />
              <Button
                size="small"
                severity="danger"
                variant="text"
                onClick={() => setExercises((list) => list.filter((_, j) => j !== i))}
              >
                Remove
              </Button>
            </div>
            <div className={styles.exerciseGrid}>
              <div className={styles.field}>
                <label className={styles.hint}>Sets</label>
                <InputText
                  type="number" inputMode="numeric" min={1} className={styles.input}
                  value={ex.sets}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateExercise(i, { sets: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.hint}>
                  {ex.unit === "seconds" ? "Hold (seconds)" : "Reps"}
                </label>
                <InputText
                  type="number" inputMode="numeric" min={1} className={styles.input}
                  value={ex.durationOrReps}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateExercise(i, { durationOrReps: e.target.value })
                  }
                />
              </div>
              <div className={styles.field}>
                <label className={styles.hint}>Intensity min %</label>
                <InputText
                  type="number" inputMode="numeric" min={0} max={100} className={styles.input}
                  value={ex.intensityMin}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateExercise(i, { intensityMin: e.target.value })
                  }
                />
              </div>
              <div className={styles.field}>
                <label className={styles.hint}>Intensity max %</label>
                <InputText
                  type="number" inputMode="numeric" min={0} max={100} className={styles.input}
                  value={ex.intensityMax}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateExercise(i, { intensityMax: e.target.value })
                  }
                />
              </div>
            </div>
            <ToggleButtonGroup
              value={ex.unit}
              allowEmpty={false}
              onValueChange={(e: { value?: unknown }) => updateExercise(i, { unit: e.value as "seconds" | "reps" })}
            >
              <ToggleButton.Root value="seconds" size="small">Timed hold</ToggleButton.Root>
              <ToggleButton.Root value="reps" size="small">Reps</ToggleButton.Root>
            </ToggleButtonGroup>
          </div>
        ))}
        {/* Autocomplete suggestions from previously logged exercise names */}
        <datalist id="known-exercises">
          {init.knownExerciseNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <Button
          size="small"
          severity="secondary"
          onClick={() => setExercises((list) => [...list, { ...BLANK_EXERCISE }])}
        >
          + Add exercise
        </Button>
      </div>

      {/* Notes */}
      <div className={styles.field}>
        <label className={styles.sectionLabel} htmlFor="log-activity-notes">Activity notes</label>
        <Textarea
          id="log-activity-notes"
          rows={2}
          className={styles.input}
          placeholder="e.g. Gym + walking at cafe"
          value={activityNotes}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setActivityNotes(e.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.sectionLabel} htmlFor="log-general-notes">General notes</label>
        <Textarea
          id="log-general-notes"
          rows={4}
          className={styles.input}
          placeholder="Anything worth remembering about today's symptoms"
          value={generalNotes}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setGeneralNotes(e.target.value)}
        />
      </div>

      {/* Submit + feedback */}
      <div className={styles.actions}>
        <Button onClick={submit} disabled={isPending}>
          {isPending ? "Saving…" : "Save day"}
        </Button>
        {result?.ok && <span className={styles.success}>Saved {result.date} ✓</span>}
        {result && !result.ok && (
          <span className={styles.error}>{result.errors.join(" · ")}</span>
        )}
      </div>
    </div>
  );
}

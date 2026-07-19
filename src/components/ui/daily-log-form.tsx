// The daily log entry form (client component) — the app's core 30-second
// habit. Every control is the real PrimeReact component (DatePicker,
// InputNumber, AutoComplete, Slider, ToggleButton, Textarea, Message) so the
// whole form carries the library's styling consistently. Holds all form
// state locally, submits a typed payload to the saveDailyLog server action,
// and navigates by date so past days can be edited with the same form.
//
// Receives display-ready initial values from the server page; talks to the
// server only through the action (never imports repositories — PLAN.md §5).
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@primereact/ui/button";
import { Label } from "@primereact/ui/label";
import { InputNumber } from "@primereact/ui/inputnumber";
import { DatePicker } from "@primereact/ui/datepicker";
import { AutoComplete } from "@primereact/ui/autocomplete";
import type {
  AutoCompleteInputValueChangeEvent,
  AutoCompleteValueChangeEvent,
} from "@primereact/types/primitive/autocomplete";
import { Textarea } from "@primereact/ui/textarea";
import { Slider } from "@primereact/ui/slider";
import { ToggleButton } from "@primereact/ui/togglebutton";
import { ToggleButtonGroup } from "@primereact/ui/togglebuttongroup";
import { Message } from "@primereact/ui/message";
import { Calendar } from "@primeicons/react/calendar";
import { ChevronUp } from "@primeicons/react/chevron-up";
import { ChevronDown } from "@primeicons/react/chevron-down";
import type { InputNumberRootValueChangeEvent } from "@primereact/types/primitive/inputnumber";
import { ACTIVITY_TAGS, PAIN_TYPES, type ActivityTag, type PainType } from "@/db/schema";
import { PAIN_SCALE_MAX, PAIN_SCALE_MIN, PAIN_SCALE_STEP } from "@/domain/constants";
import { saveDailyLog, type SaveResult } from "@/app/log/actions";
import type { DailyLogFormValues } from "@/app/log/schema";
import styles from "./daily-log-form.module.css";

// One exercise row in the form. Numeric fields are number|null — PrimeReact's
// InputNumber natively supports an empty (null) state.
type ExerciseDraft = {
  exerciseName: string;
  sets: number | null;
  durationOrReps: number | null;
  unit: "seconds" | "reps";
  intensityMin: number | null;
  intensityMax: number | null;
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
  knownExerciseNames: string[]; // autocomplete suggestions
};

// Empty exercise row used by the "Add exercise" button.
const BLANK_EXERCISE: ExerciseDraft = {
  exerciseName: "",
  sets: 3,
  durationOrReps: 20,
  unit: "seconds",
  intensityMin: null,
  intensityMax: null,
  notes: "",
};

// ISO YYYY-MM-DD ↔ local Date, without timezone drift.
function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function dateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
        <span className={styles.painValue}>{value ?? "—"}{value != null && " / 10"}</span>
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

// PrimeReact DatePicker composed for a single-date input with calendar popup.
function LogDatePicker({ date, onChange }: { date: string; onChange: (iso: string) => void }) {
  return (
    <DatePicker.Root
      value={isoToDate(date)}
      onValueChange={(e: { value: unknown }) => {
        if (e.value instanceof Date) onChange(dateToIso(e.value));
      }}
      dateFormat="yy-mm-dd"
    >
      <DatePicker.Input id="log-date" />
      <DatePicker.Trigger aria-label="Open calendar">
        <Calendar size={16} />
      </DatePicker.Trigger>
      <DatePicker.Portal>
        <DatePicker.Positioner>
          <DatePicker.Popup>
            <DatePicker.Calendar>
              <DatePicker.Header>
                <DatePicker.Prev />
                <DatePicker.Title>
                  <DatePicker.SelectMonth />
                  <DatePicker.SelectYear />
                  <DatePicker.Decade />
                </DatePicker.Title>
                <DatePicker.Next />
              </DatePicker.Header>
              <DatePicker.Table>
                <DatePicker.TableHead />
                <DatePicker.TableBody />
                <DatePicker.TableBody view="month" />
                <DatePicker.TableBody view="year" />
              </DatePicker.Table>
            </DatePicker.Calendar>
          </DatePicker.Popup>
        </DatePicker.Positioner>
      </DatePicker.Portal>
    </DatePicker.Root>
  );
}

// PrimeReact AutoComplete composed as a free-text input with a suggestion
// popup filtered from previously logged exercise names.
function ExerciseNameInput({
  value,
  suggestions,
  onChange,
}: {
  value: string;
  suggestions: string[];
  onChange: (name: string) => void;
}) {
  const filtered = suggestions.filter((n) => n.toLowerCase().includes(value.toLowerCase()));
  return (
    <AutoComplete.Root
      options={filtered}
      inputValue={value}
      onInputValueChange={(e: AutoCompleteInputValueChangeEvent) => onChange(e.query ?? "")}
      onValueChange={(e: AutoCompleteValueChangeEvent) => {
        if (typeof e.value === "string") onChange(e.value);
      }}
      className={styles.input}
    >
      <AutoComplete.Input placeholder="Exercise name" aria-label="Exercise name" />
      <AutoComplete.Portal>
        <AutoComplete.Positioner>
          <AutoComplete.Popup>
            <AutoComplete.List />
          </AutoComplete.Popup>
        </AutoComplete.Positioner>
      </AutoComplete.Portal>
    </AutoComplete.Root>
  );
}

// One composed PrimeReact InputNumber (input + stacked spinner buttons),
// shared by every numeric field in the form so the composition lives once.
function NumberField({
  id,
  value,
  onChange,
  min,
  max,
  step,
  placeholder,
  maxFractionDigits,
  useGrouping,
}: {
  id?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  maxFractionDigits?: number;
  useGrouping?: boolean;
}) {
  return (
    <InputNumber.Root
      value={value}
      onValueChange={(e: InputNumberRootValueChangeEvent) => onChange(e.value ?? null)}
      min={min}
      max={max}
      step={step}
      maxFractionDigits={maxFractionDigits}
      useGrouping={useGrouping ?? false}
      className={styles.input}
    >
      <InputNumber.Input id={id} placeholder={placeholder} />
      <InputNumber.Group>
        <InputNumber.Increment aria-label="Increase">
          <ChevronUp size={12} />
        </InputNumber.Increment>
        <InputNumber.Decrement aria-label="Decrease">
          <ChevronDown size={12} />
        </InputNumber.Decrement>
      </InputNumber.Group>
    </InputNumber.Root>
  );
}

export function DailyLogForm({ init }: { init: DailyLogFormInit }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SaveResult | null>(null);

  // Form state, seeded from the server-provided initial values.
  const [steps, setSteps] = useState<number | null>(init.steps);
  const [painMorning, setPainMorning] = useState(init.painMorning);
  const [painDaytime, setPainDaytime] = useState(init.painDaytime);
  const [painNight, setPainNight] = useState(init.painNight);
  const [sleepHours, setSleepHours] = useState<number | null>(init.sleepHours);
  const [activityTags, setActivityTags] = useState<ActivityTag[]>(init.activityTags);
  const [painTypes, setPainTypes] = useState<PainType[]>(init.painTypes);
  const [activityNotes, setActivityNotes] = useState(init.activityNotes);
  const [generalNotes, setGeneralNotes] = useState(init.generalNotes);
  const [exercises, setExercises] = useState<ExerciseDraft[]>(init.exercises);

  // Editing a different day = navigating to it; the server page reloads the
  // form with that day's data (or a fresh prefill).
  function changeDate(newDate: string) {
    if (newDate && newDate !== init.date) router.push(`/log?date=${newDate}`);
  }

  function updateExercise(index: number, patch: Partial<ExerciseDraft>) {
    setExercises((list) => list.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)));
  }

  function submit() {
    // Assemble the typed payload the server action validates with zod.
    const payload: DailyLogFormValues = {
      date: init.date,
      steps,
      painMorning,
      painDaytime,
      painNight,
      sleepHours,
      activityTags,
      painTypes,
      activityNotes: activityNotes.trim() === "" ? null : activityNotes,
      generalNotes: generalNotes.trim() === "" ? null : generalNotes,
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
      const res = await saveDailyLog(payload);
      setResult(res);
    });
  }

  return (
    <div className={styles.form}>
      {/* Date being logged — PrimeReact DatePicker with calendar popup */}
      <div className={styles.section}>
        <Label htmlFor="log-date" className={styles.sectionLabel}>Date</Label>
        <LogDatePicker date={init.date} onChange={changeDate} />
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
          <Label htmlFor="log-steps" className={styles.sectionLabel}>Steps</Label>
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
          <Label htmlFor="log-sleep" className={styles.sectionLabel}>Sleep (hours)</Label>
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
              <ExerciseNameInput
                value={ex.exerciseName}
                suggestions={init.knownExerciseNames}
                onChange={(name) => updateExercise(i, { exerciseName: name })}
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
                <Label className={styles.hint}>Sets</Label>
                <NumberField
                  value={ex.sets}
                  onChange={(v) => updateExercise(i, { sets: v })}
                  min={1}
                  max={99}
                />
              </div>
              <div className={styles.field}>
                <Label className={styles.hint}>
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
                <Label className={styles.hint}>Intensity min %</Label>
                <NumberField
                  value={ex.intensityMin}
                  onChange={(v) => updateExercise(i, { intensityMin: v })}
                  min={0}
                  max={100}
                />
              </div>
              <div className={styles.field}>
                <Label className={styles.hint}>Intensity max %</Label>
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
              <ToggleButton.Root value="seconds" size="small">Timed hold</ToggleButton.Root>
              <ToggleButton.Root value="reps" size="small">Reps</ToggleButton.Root>
            </ToggleButtonGroup>
          </div>
        ))}
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
        <Label htmlFor="log-activity-notes" className={styles.sectionLabel}>Activity notes</Label>
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
        <Label htmlFor="log-general-notes" className={styles.sectionLabel}>General notes</Label>
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
        {result?.ok && (
          <Message.Root severity="success" size="small">
            <Message.Content>
              <Message.Text>Saved {result.date} ✓</Message.Text>
            </Message.Content>
          </Message.Root>
        )}
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

// The daily log entry form (client component) — the app's core 30-second
// habit. Every control is the real PrimeReact component (DatePicker,
// InputNumber, AutoComplete, Slider, ToggleButton, Textarea, Message) so the
// whole form carries the library's styling consistently. Holds all form
// state locally, submits a typed payload to the saveDailyLog server action,
// and navigates by date so past days can be edited with the same form.
//
// Section order follows the natural order of the day: how did it feel
// (pain) → what did the day look like (activity) → what physio was done →
// anything else worth remembering (notes).
//
// Receives display-ready initial values from the server page; talks to the
// server only through the action (never imports repositories — PLAN.md §5).
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@primereact/ui/button";
import { InputText } from "@primereact/ui/inputtext";
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
import { ChevronLeft } from "@primeicons/react/chevron-left";
import { ChevronRight } from "@primeicons/react/chevron-right";
import { WavePulse } from "@primeicons/react/wave-pulse";
import { Moon } from "@primeicons/react/moon";
import type { InputNumberRootValueChangeEvent } from "@primereact/types/primitive/inputnumber";
import { PAIN_TYPES, ACTIVITY_TAGS } from "@/db/schema";
import {
  PAIN_SCALE_MAX,
  PAIN_SCALE_MIN,
  PAIN_SCALE_STEP,
} from "@/domain/constants";
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
  activityTags: string[];
  painTypes: string[];
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
        <span className={styles.fieldLabel}>{label}</span>
        <span className={styles.painValue}>
          {value ?? "—"}
          {value != null && " / 10"}
        </span>
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
        <Button
          size="small"
          severity="secondary"
          variant="text"
          onClick={() => onChange(null)}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}

// A group of clickable chips (known suggestions + whatever custom values are
// already selected) plus a small "add custom" row — shared by Pain type and
// Activity so both behave identically. Toggling a custom chip off removes it
// the same way toggling off a known one does; there's no separate list to
// manage.
function TagMultiSelect({
  value,
  options,
  onChange,
  customPlaceholder,
}: {
  value: string[];
  options: readonly string[];
  onChange: (next: string[]) => void;
  customPlaceholder: string;
}) {
  const [draft, setDraft] = useState("");
  const chips = [...options, ...value.filter((v) => !options.includes(v))];

  function addCustom() {
    const trimmed = draft.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setDraft("");
  }

  return (
    <div className={styles.tagSelect}>
      <ToggleButtonGroup
        multiple
        allowEmpty
        value={value}
        onValueChange={(e: { value?: unknown }) =>
          onChange((e.value ?? []) as string[])
        }
      >
        {chips.map((t) => (
          <ToggleButton.Root key={t} value={t}>
            <ToggleButton.Indicator>{t}</ToggleButton.Indicator>
          </ToggleButton.Root>
        ))}
      </ToggleButtonGroup>
      <div className={styles.tagCustomRow}>
        <InputText
          value={draft}
          placeholder={customPlaceholder}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setDraft(e.target.value)
          }
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          className={styles.input}
        />
        <Button
          size="small"
          severity="secondary"
          variant="outlined"
          onClick={addCustom}
          disabled={draft.trim() === ""}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

// PrimeReact DatePicker composed for a single-date input with calendar popup,
// following the official styled-mode demo: the input renders as InputText
// (that's where its text-field styling comes from) and the nav arrows render
// as icon Buttons.
function LogDatePicker({
  date,
  onChange,
}: {
  date: string;
  onChange: (iso: string) => void;
}) {
  // Stable Date identity per ISO date (fresh objects would re-trigger the
  // picker's value sync every render).
  //
  // Known upstream issue (PrimeReact 11.0.0, no patch yet): DatePicker.Root
  // only formats the input's displayed text when its `value` prop actually
  // CHANGES — on mount there's no prior value to change from, so the input
  // renders blank (confirmed in both dev and production builds; a real
  // bug, not the dev-only artifact previously assumed here). Rendering
  // `null` for one tick and then swapping in the real value forces that
  // transition every mount, which reliably triggers the library's own
  // sync. Re-check after the next primereact release.
  const dateValue = useMemo(() => isoToDate(date), [date]);
  const [mountedValue, setMountedValue] = useState<Date | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setMountedValue(dateValue), 0);
    return () => clearTimeout(id);
    // Intentionally re-runs only on mount (per `date`, since this whole
    // component remounts via `key={date}` on the page) — dateValue is
    // excluded because re-triggering the null-flash on every parent
    // re-render would be wrong, only a genuine new date should.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <DatePicker.Root
      value={mountedValue}
      onValueChange={(e: { value: unknown }) => {
        if (e.value instanceof Date) onChange(dateToIso(e.value));
      }}
      dateFormat="DD, dd MM, yy"
    >
      <DatePicker.Input as={InputText} id="log-date" readOnly />
      <DatePicker.Trigger aria-label="Open calendar">
        <Calendar size={16} />
      </DatePicker.Trigger>
      <DatePicker.Portal>
        <DatePicker.Positioner align="start">
          <DatePicker.Popup>
            <DatePicker.Body>
              <DatePicker.Panel>
                <DatePicker.Calendar>
                  <DatePicker.Header>
                    <DatePicker.Prev
                      as={Button}
                      iconOnly
                      variant="text"
                      rounded
                      severity="secondary"
                      size="small"
                    >
                      <ChevronLeft />
                    </DatePicker.Prev>
                    <DatePicker.Title>
                      <DatePicker.SelectMonth />
                      <DatePicker.SelectYear />
                      <DatePicker.Decade />
                    </DatePicker.Title>
                    <DatePicker.Next
                      as={Button}
                      iconOnly
                      variant="text"
                      rounded
                      severity="secondary"
                      size="small"
                    >
                      <ChevronRight />
                    </DatePicker.Next>
                  </DatePicker.Header>
                  <DatePicker.Table>
                    <DatePicker.TableHead />
                    <DatePicker.TableBody />
                    <DatePicker.TableBody view="month" />
                    <DatePicker.TableBody view="year" />
                  </DatePicker.Table>
                </DatePicker.Calendar>
              </DatePicker.Panel>
            </DatePicker.Body>
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
  const filtered = suggestions.filter((n) =>
    n.toLowerCase().includes(value.toLowerCase()),
  );
  return (
    <AutoComplete.Root
      options={filtered}
      inputValue={value}
      onInputValueChange={(e: AutoCompleteInputValueChangeEvent) =>
        onChange(e.query ?? "")
      }
      onValueChange={(e: AutoCompleteValueChangeEvent) => {
        if (typeof e.value === "string") onChange(e.value);
      }}
      className={styles.input}
    >
      {/* as={InputText}: the AutoComplete input part renders unstyled
          without this composition (AGENTS.md PrimeReact gotchas). */}
      <AutoComplete.Input
        as={InputText}
        placeholder="Exercise name"
        aria-label="Exercise name"
      />
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
      onValueChange={(e: InputNumberRootValueChangeEvent) =>
        onChange(e.value ?? null)
      }
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
  const [activityTags, setActivityTags] = useState<string[]>(init.activityTags);
  const [painTypes, setPainTypes] = useState<string[]>(init.painTypes);
  const [activityNotes, setActivityNotes] = useState(init.activityNotes);
  const [generalNotes, setGeneralNotes] = useState(init.generalNotes);
  const [exercises, setExercises] = useState<ExerciseDraft[]>(init.exercises);

  // Editing a different day = navigating to it; the server page reloads the
  // form with that day's data (or a fresh prefill).
  function changeDate(newDate: string) {
    if (newDate && newDate !== init.date) router.push(`/log?date=${newDate}`);
  }

  function updateExercise(index: number, patch: Partial<ExerciseDraft>) {
    setExercises((list) =>
      list.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)),
    );
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
      {/* Date */}
      <div className={styles.dateBar}>
        <LogDatePicker date={init.date} onChange={changeDate} />
        <span className={styles.hint}>
          {init.isExisting
            ? "This day already has a log — saving will update it."
            : "New day — exercises are prefilled from your last session."}
        </span>
      </div>

      {/* Pain: readings + character, grouped as one section since they're
          the same question asked two ways ("how much" then "what kind"). */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Pain</h2>
        <span className={styles.fieldLabel}>Pain level (0–10)</span>
        <PainInput
          label="Morning"
          value={painMorning}
          onChange={setPainMorning}
        />
        <PainInput
          label="Daytime"
          value={painDaytime}
          onChange={setPainDaytime}
        />
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

      {/* Activity: what the day looked like — steps, sleep, and tags all
          answer "what happened today", so they live together. */}
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

      {/* Physio exercises */}
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

      {/* Notes — free-text elaboration, last since it's "anything else" */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Notes</h2>
        <div className={styles.field}>
          <Label htmlFor="log-activity-notes" className={styles.fieldLabel}>
            Activity notes
          </Label>
          <Textarea
            id="log-activity-notes"
            rows={2}
            className={styles.input}
            placeholder="e.g. Gym + walking at cafe"
            value={activityNotes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setActivityNotes(e.target.value)
            }
          />
        </div>
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

      {/* Submit + feedback */}
      <div className={styles.actions}>
        <Button
          onClick={submit}
          disabled={isPending}
          fluid
          size="large"
          severity="contrast"
        >
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

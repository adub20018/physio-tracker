// Shared field building blocks for the /log flow — the overview's date bar
// and every section form (Pain, Activity, Physio, Notes) compose these
// rather than each reimplementing the same PrimeReact wiring.
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@primereact/ui/button";
import { InputText } from "@primereact/ui/inputtext";
import { InputNumber } from "@primereact/ui/inputnumber";
import { DatePicker } from "@primereact/ui/datepicker";
import { AutoComplete } from "@primereact/ui/autocomplete";
import type {
  AutoCompleteInputValueChangeEvent,
  AutoCompleteValueChangeEvent,
} from "@primereact/types/primitive/autocomplete";
import { ToggleButton } from "@primereact/ui/togglebutton";
import { ToggleButtonGroup } from "@primereact/ui/togglebuttongroup";
import { Calendar } from "@primeicons/react/calendar";
import { ChevronUp } from "@primeicons/react/chevron-up";
import { ChevronDown } from "@primeicons/react/chevron-down";
import { ChevronLeft } from "@primeicons/react/chevron-left";
import { ChevronRight } from "@primeicons/react/chevron-right";
import type { InputNumberRootValueChangeEvent } from "@primereact/types/primitive/inputnumber";
import {
  PAIN_SCALE_MAX,
  PAIN_SCALE_MIN,
  PAIN_SCALE_STEP,
} from "@/domain/constants";
import { Slider } from "@primereact/ui/slider";
import styles from "./log-shared.module.css";

// One exercise row in the Physio form. Numeric fields are number|null —
// PrimeReact's InputNumber natively supports an empty (null) state.
export type ExerciseDraft = {
  exerciseName: string;
  sets: number | null;
  durationOrReps: number | null;
  unit: "seconds" | "reps";
  intensityMin: number | null;
  intensityMax: number | null;
  notes: string;
};

// Empty exercise row used by the "Add exercise" button.
export const BLANK_EXERCISE: ExerciseDraft = {
  exerciseName: "",
  sets: 3,
  durationOrReps: 20,
  unit: "seconds",
  intensityMin: null,
  intensityMax: null,
  notes: "",
};

// ISO YYYY-MM-DD ↔ local Date, without timezone drift.
export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function dateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// A single labelled pain slider with its value readout and a clear control.
// null means "not recorded" and renders as an em dash.
export function PainInput({
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
export function TagMultiSelect({
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
        className={styles.tagGroup}
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
// as icon Buttons. Only used on the overview page now — section pages show
// the active date as a plain label (LogSectionHeader).
export function LogDatePicker({
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
    // Re-runs whenever the resolved date actually changes, not just on
    // mount: this component does NOT reliably remount when `date` changes
    // (no `key={date}` anywhere it's used, and Next's router cache can
    // reuse this exact client instance across a soft /log refresh — e.g.
    // the date rolling over past midnight while the page is still open).
    // Without this, `mountedValue` — what's actually shown in the input —
    // would stay frozen on whatever date it first mounted with, even after
    // the page's own content has moved on to the new day.
  }, [dateValue]);
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
export function ExerciseNameInput({
  value,
  suggestions,
  onChange,
  invalid,
}: {
  value: string;
  suggestions: string[];
  onChange: (name: string) => void;
  invalid?: boolean;
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
      // invalid={invalid}
      className={styles.input}
    >
      {/* as={InputText}: the AutoComplete input part renders unstyled
          without this composition (AGENTS.md PrimeReact gotchas). */}
      <AutoComplete.Input
        as={InputText}
        invalid={invalid}
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
// shared by every numeric field in the flow so the composition lives once.
export function NumberField({
  id,
  value,
  onChange,
  min,
  max,
  step,
  placeholder,
  maxFractionDigits,
  useGrouping,
  invalid,
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
  invalid?: boolean;
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
      invalid={invalid}
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

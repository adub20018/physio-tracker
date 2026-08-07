// "Export CSV" row control — opens a dialog to pick a time range before the
// real <a download> navigation fires (a download can't be a client route).
"use client";

import { useMemo, useState } from "react";
import { Dialog } from "@primereact/ui/dialog";
import { Button } from "@primereact/ui/button";
import { InputText } from "@primereact/ui/inputtext";
import { RadioButton } from "@primereact/ui/radiobutton";
import { RadioButtonGroup } from "@primereact/ui/radiobuttongroup";
import { DatePicker } from "@primereact/ui/datepicker";
import { Times } from "@primeicons/react/times";
import { Calendar } from "@primeicons/react/calendar";
import { ChevronLeft } from "@primeicons/react/chevron-left";
import { ChevronRight } from "@primeicons/react/chevron-right";
import { isoToDate, dateToIso } from "@/components/ui/log/log-fields";
import {
  EXPORT_RANGES,
  EXPORT_RANGE_LABELS,
  type ExportRangeOption,
} from "@/lib/export-range";
import styles from "./export-csv-button.module.css";

function todayIsoClient(): string {
  return dateToIso(new Date());
}

function daysAgoIsoClient(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateToIso(d);
}

function buildExportHref(
  range: ExportRangeOption,
  from: string,
  to: string,
): string | null {
  if (range === "custom") {
    if (!from || !to || from > to) return null;
    return `/history/export?range=custom&from=${from}&to=${to}`;
  }
  return `/history/export?range=${range}`;
}

// A simplified DatePicker (no prev/next-day stepper, unlike LogDatePicker)
// for the custom range's From/To fields.
function RangeDateField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (iso: string) => void;
}) {
  const dateValue = useMemo(() => isoToDate(value), [value]);
  return (
    <div className={styles.dateField}>
      <label className={styles.dateLabel} htmlFor={id}>
        {label}
      </label>
      <DatePicker.Root
        value={dateValue}
        onValueChange={(e: { value: unknown }) => {
          if (e.value instanceof Date) onChange(dateToIso(e.value));
        }}
        dateFormat="dd M yy"
      >
        <DatePicker.Input
          as={InputText}
          className={styles.dateInput}
          id={id}
          readOnly
        />
        <DatePicker.Trigger
          variant="outlined"
          severity="secondary"
          aria-label={`Open ${label.toLowerCase()} calendar`}
        >
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
    </div>
  );
}

export function ExportCsvButton() {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<ExportRangeOption>("all");
  const [from, setFrom] = useState(() => daysAgoIsoClient(30));
  const [to, setTo] = useState(() => todayIsoClient());

  // Reset selection on open, adjusted during render (see NameDialog for why
  // not an effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setRange("all");
      setFrom(daysAgoIsoClient(30));
      setTo(todayIsoClient());
    }
  }

  const exportHref = buildExportHref(range, from, to);

  return (
    <>
      <Button
        severity="secondary"
        variant="outlined"
        onClick={() => setOpen(true)}
      >
        Export CSV
      </Button>
      <Dialog.Root
        open={open}
        onOpenChange={(e: { value?: boolean }) => setOpen(e.value ?? false)}
        modal
      >
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Popup className={styles.popup}>
              <Dialog.Header>
                <Dialog.Title>Export data</Dialog.Title>
                <Dialog.HeaderActions>
                  <Dialog.Close
                    aria-label="Cancel"
                    as={Button}
                    iconOnly
                    variant="text"
                    rounded
                    severity="secondary"
                  >
                    <Times size={16} />
                  </Dialog.Close>
                </Dialog.HeaderActions>
              </Dialog.Header>
              <Dialog.Content className={styles.content}>
                <span className={styles.sectionLabel}>Time range</span>
                <RadioButtonGroup
                  name="export-range"
                  value={range}
                  onValueChange={(e: { value?: unknown }) =>
                    setRange(e.value as ExportRangeOption)
                  }
                  className={styles.radioGroup}
                >
                  {EXPORT_RANGES.map((opt) => (
                    <label
                      key={opt}
                      className={styles.radioRow}
                      htmlFor={`export-range-${opt}`}
                    >
                      <RadioButton.Root
                        value={opt}
                        size="small"
                        inputId={`export-range-${opt}`}
                      >
                        <RadioButton.Box>
                          <RadioButton.Indicator />
                        </RadioButton.Box>
                      </RadioButton.Root>
                      <span>{EXPORT_RANGE_LABELS[opt]}</span>
                    </label>
                  ))}
                </RadioButtonGroup>
                {range === "custom" && (
                  <div className={styles.customRange}>
                    <RangeDateField
                      id="export-range-from"
                      label="From"
                      value={from}
                      onChange={setFrom}
                    />
                    <RangeDateField
                      id="export-range-to"
                      label="To"
                      value={to}
                      onChange={setTo}
                    />
                  </div>
                )}
              </Dialog.Content>
              <Dialog.Footer className={styles.footer}>
                <Button
                  severity="secondary"
                  variant="outlined"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                {exportHref ? (
                  <Button
                    as="a"
                    href={exportHref}
                    download
                    onClick={() => setOpen(false)}
                  >
                    Export
                  </Button>
                ) : (
                  <Button disabled>Export</Button>
                )}
              </Dialog.Footer>
            </Dialog.Popup>
          </Dialog.Positioner>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

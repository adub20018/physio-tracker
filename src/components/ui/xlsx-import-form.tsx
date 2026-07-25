// Two-step spreadsheet import: preview parses the file and classifies rows
// as new vs. overwriting an already-logged day without writing anything;
// the user then confirms (optionally including overwrites) before any data
// actually changes. Mirrors the old CLI script's confirm-before-overwrite
// behavior (AGENTS.md data-safety rule) as an in-app flow instead.
"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@primereact/ui/button";
import { Message } from "@primereact/ui/message";
import { previewXlsxImport, confirmXlsxImport } from "@/app/log/import/actions";
import type { ImportPreview } from "@/app/log/import/actions";
import styles from "./xlsx-import-form.module.css";

type Stage =
  | { kind: "picking" }
  | { kind: "preview"; preview: ImportPreview; includeOverwrites: boolean }
  | { kind: "done"; imported: number };

export function XlsxImportForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>({ kind: "picking" });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function pickAndPreview() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a .xlsx file first.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await previewXlsxImport(file);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStage({ kind: "preview", preview: result.preview, includeOverwrites: false });
    });
  }

  function confirm() {
    if (stage.kind !== "preview") return;
    const { preview, includeOverwrites } = stage;
    startTransition(async () => {
      const result = await confirmXlsxImport(preview.parsed, includeOverwrites, preview.overwriteDates);
      setStage({ kind: "done", imported: result.imported });
    });
  }

  function reset() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setStage({ kind: "picking" });
    setError(null);
  }

  if (stage.kind === "done") {
    return (
      <div className={styles.card}>
        <Message.Root severity="success" size="small">
          <Message.Content>
            <Message.Text>
              Imported {stage.imported} day{stage.imported === 1 ? "" : "s"}.
            </Message.Text>
          </Message.Content>
        </Message.Root>
        <Button onClick={reset} fluid severity="secondary">
          Import another file
        </Button>
      </div>
    );
  }

  if (stage.kind === "preview") {
    const { preview, includeOverwrites } = stage;
    return (
      <div className={styles.card}>
        <p className={styles.summaryLine}>
          {preview.newDates.length} new day{preview.newDates.length === 1 ? "" : "s"} ready to import.
        </p>
        {preview.overwriteDates.length > 0 && (
          <label className={styles.overwriteRow}>
            <input
              type="checkbox"
              checked={includeOverwrites}
              onChange={(e) =>
                setStage({ kind: "preview", preview, includeOverwrites: e.target.checked })
              }
            />
            Also overwrite {preview.overwriteDates.length} day
            {preview.overwriteDates.length === 1 ? "" : "s"} already in my log (any edits made in
            the app for those days will be replaced)
          </label>
        )}
        {preview.warnings.length > 0 && (
          <Message.Root severity="warn" size="small">
            <Message.Content>
              <Message.Text>
                {preview.warnings.length} warning{preview.warnings.length === 1 ? "" : "s"}:{" "}
                {preview.warnings.slice(0, 5).join(" · ")}
                {preview.warnings.length > 5 ? ` … (+${preview.warnings.length - 5} more)` : ""}
              </Message.Text>
            </Message.Content>
          </Message.Root>
        )}
        <div className={styles.actions}>
          <Button onClick={confirm} disabled={isPending} fluid size="large" severity="contrast">
            {isPending
              ? "Importing…"
              : `Import ${includeOverwrites ? preview.parsed.length : preview.newDates.length} day${
                  (includeOverwrites ? preview.parsed.length : preview.newDates.length) === 1 ? "" : "s"
                }`}
          </Button>
          <Button onClick={reset} disabled={isPending} fluid severity="secondary">
            Choose a different file
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <input ref={fileInputRef} type="file" accept=".xlsx" className={styles.fileInput} />
      <div className={styles.actions}>
        <Button onClick={pickAndPreview} disabled={isPending} fluid size="large" severity="contrast">
          {isPending ? "Reading file…" : "Preview import"}
        </Button>
        {error && (
          <Message.Root severity="error" size="small">
            <Message.Content>
              <Message.Text>{error}</Message.Text>
            </Message.Content>
          </Message.Root>
        )}
      </div>
    </div>
  );
}

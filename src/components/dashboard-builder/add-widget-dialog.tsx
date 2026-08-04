// Edit-mode "Add widget" picker — a grid of live preview cards for every
// widget type not already on the dashboard, grouped by category. Previews
// render against the signed-in user's own data once there's enough of it
// to be useful (MIN_LOGGED_DAYS_FOR_REAL_PREVIEWS), falling back to the
// fabricated mock account in widget-preview-data.ts for fresh/sparse
// accounts, whose real charts would mostly just show empty states. Follows
// ConfirmDialog's Dialog.Root/Portal/Backdrop/Positioner/Popup structure
// (src/components/ui/shared/confirm-dialog.tsx) but stays open after each
// pick, so several widgets can be added in one pass rather than reopening
// the dialog each time.
"use client";

import { startTransition, useEffect, useState } from "react";
import { Dialog } from "@primereact/ui/dialog";
import { Button } from "@primereact/ui/button";
import { X } from "lucide-react";
import type { ChartDataBundle } from "@/domain/dashboard-bundle";
import {
  WIDGET_DEFINITIONS,
  isStackedChart,
  type WidgetCategory,
  type WidgetDefinition,
} from "./widget-registry";
import { WidgetPreview } from "./widget-preview";
import { MOCK_CHART_DATA_BUNDLE, MOCK_TODAY } from "./widget-preview-data";
import styles from "./add-widget-dialog.module.css";

const CATEGORIES: WidgetCategory[] = [
  "Stat tiles",
  "Dashboard charts",
  "Insights charts",
];

// One clickable preview card. A plain <button> here would nest StatTile's
// own InfoTooltip trigger button inside it — invalid HTML (buttons can't
// nest) that React flags as a hydration error. A div with button semantics
// avoids the nesting while staying clickable and keyboard-operable;
// widget-preview.module.css also sets pointer-events: none on the preview
// itself, so the inner tooltip trigger is inert.
function WidgetCard({
  definition,
  onAdd,
  loading,
  bundle,
  today,
}: {
  definition: WidgetDefinition;
  onAdd: (widgetType: string) => void;
  loading: boolean;
  bundle: ChartDataBundle;
  today: string;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={styles.card}
      onClick={() => onAdd(definition.type)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAdd(definition.type);
        }
      }}
    >
      <WidgetPreview
        definition={definition}
        loading={loading}
        bundle={bundle}
        today={today}
      />
      <span className={styles.cardLabel}>{definition.label}</span>
    </div>
  );
}

export function AddWidgetDialog({
  open,
  onOpenChange,
  existingTypes,
  onAdd,
  realBundle,
  realToday,
  hasEnoughDataForPreviews,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Widget types already on the dashboard — hidden from the picker rather
  // than shown disabled, since a second identical chart isn't useful.
  existingTypes: Set<string>;
  onAdd: (widgetType: string) => void;
  // The signed-in user's own data (same bundle the real dashboard renders
  // from) and today's date — used for previews instead of the mock account
  // once hasEnoughDataForPreviews is true. See
  // domain/constants.ts:MIN_LOGGED_DAYS_FOR_REAL_PREVIEWS for the threshold.
  realBundle: ChartDataBundle;
  realToday: string;
  hasEnoughDataForPreviews: boolean;
}) {
  const available = WIDGET_DEFINITIONS.filter((d) => !existingTypes.has(d.type));

  // Resolved once — every card in the grid previews from the same source,
  // real or mock, not a per-widget decision.
  const previewBundle = hasEnoughDataForPreviews ? realBundle : MOCK_CHART_DATA_BUNDLE;
  const previewToday = hasEnoughDataForPreviews ? realToday : MOCK_TODAY;

  // The picker renders 20+ live chart instances — mounting them all in one
  // commit is a single, uninterruptible block of JS long enough to stall
  // the backdrop's own fade-in (they share the same main thread), so the
  // dim only appeared to show up once every chart had finished mounting.
  // Marking the swap as a startTransition wasn't enough on its own — React
  // only yields mid-transition when something else needs the thread, and
  // with nothing else competing it just ran the whole ~20-chart render in
  // one go anyway.
  //
  // What actually fixes it is keeping every individual commit small:
  // reveal a handful of previews per animation frame instead of all at
  // once, so the browser gets a real paint between each batch — including
  // the frame where the backdrop's own transition is playing.
  const REVEAL_BATCH_SIZE = 4;
  const [readyCount, setReadyCount] = useState(0);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let frameId = 0;

    function revealNextBatch(count: number) {
      frameId = requestAnimationFrame(() => {
        if (cancelled) return;
        const next = Math.min(count + REVEAL_BATCH_SIZE, available.length);
        startTransition(() => setReadyCount(next));
        if (next < available.length) {
          revealNextBatch(next);
        }
      });
    }
    // One frame's head start lets the dialog's own open-transition frame
    // land before the first batch starts mounting.
    frameId = requestAnimationFrame(() => revealNextBatch(0));

    // Runs when `open` flips back to false (or on unmount) — resets so the
    // next open starts from skeletons again instead of skipping straight
    // to the already-revealed count from last time.
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      setReadyCount(0);
    };
  }, [open, available.length]);

  // Reveal order doesn't need to match visual (category/grid) order — it
  // only needs to grow a little each frame — so a simple index into
  // `available` is enough to decide whether a given widget has its batch
  // turn yet.
  const revealOrder = new Map(available.map((d, i) => [d.type, i]));
  const isPreviewReady = (type: string) =>
    (revealOrder.get(type) ?? available.length) < readyCount;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e: { value?: boolean }) => onOpenChange(e.value ?? false)}
      modal
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Popup className={styles.popup}>
            <Dialog.Header>
              <Dialog.Title>Add widget</Dialog.Title>
              <Dialog.HeaderActions>
                <Dialog.Close
                  aria-label="Close"
                  as={Button}
                  iconOnly
                  variant="text"
                  rounded
                  severity="secondary"
                >
                  <X size={16} />
                </Dialog.Close>
              </Dialog.HeaderActions>
            </Dialog.Header>
            <Dialog.Content className={styles.content}>
              {available.length === 0 ? (
                <p className={styles.empty}>
                  Every available widget is already on this dashboard
                </p>
              ) : (
                CATEGORIES.map((category) => {
                  const items = available.filter((d) => d.category === category);
                  if (items.length === 0) return null;

                  // Stacked (multi-panel) charts get their own, taller
                  // preview box (widget-preview.module.css) — kept in a
                  // separate grid rather than mixed in with single-panel
                  // charts so their extra height doesn't force every card
                  // in the same row to match it.
                  const singleItems = items.filter((d) => !isStackedChart(d));
                  const stackedItems = items.filter(isStackedChart);

                  return (
                    <div key={category} className={styles.group}>
                      <h3 className={styles.groupTitle}>{category}</h3>
                      {singleItems.length > 0 && (
                        <div
                          className={
                            category === "Stat tiles"
                              ? styles.statsGrid
                              : styles.chartsGrid
                          }
                        >
                          {singleItems.map((def) => (
                            <WidgetCard
                              key={def.type}
                              definition={def}
                              onAdd={onAdd}
                              loading={!isPreviewReady(def.type)}
                              bundle={previewBundle}
                              today={previewToday}
                            />
                          ))}
                        </div>
                      )}
                      {stackedItems.length > 0 && (
                        <>
                          <h4 className={styles.subGroupTitle}>
                            Multi-panel charts
                          </h4>
                          <div className={styles.chartsGrid}>
                            {stackedItems.map((def) => (
                              <WidgetCard
                                key={def.type}
                                definition={def}
                                onAdd={onAdd}
                                loading={!isPreviewReady(def.type)}
                                bundle={previewBundle}
                                today={previewToday}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </Dialog.Content>
          </Dialog.Popup>
        </Dialog.Positioner>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

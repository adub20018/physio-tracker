// Edit-mode "Add widget" picker: grid of live preview cards, grouped by category. Previews use
// the signed-in user's own data once there's enough (MIN_LOGGED_DAYS_FOR_REAL_PREVIEWS), else a mock account.
"use client";

import { startTransition, useEffect, useState } from "react";
import { Dialog } from "@primereact/ui/dialog";
import { Button } from "@primereact/ui/button";
import { X } from "lucide-react";
import { ButtonSpinner } from "@/components/ui/shared/button-spinner";
import type { WidgetDataBundle } from "@/lib/widget-data";
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

// A div, not <button> — StatTile's own InfoTooltip trigger is a button,
// and nesting buttons is invalid HTML.
function WidgetCard({
  definition,
  onAdd,
  loading,
  adding,
  bundle,
  today,
}: {
  definition: WidgetDefinition;
  onAdd: (widgetType: string) => void;
  loading: boolean;
  // This card's widget is being added: the dashboard behind the dialog is
  // mounting it, and this card is about to disappear from the picker.
  adding: boolean;
  bundle: WidgetDataBundle;
  today: string;
}) {
  function add() {
    if (!adding) onAdd(definition.type);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-busy={adding}
      className={styles.card}
      onClick={add}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          add();
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
      {adding && (
        <span className={styles.addingOverlay} role="status">
          <ButtonSpinner />
          Adding…
        </span>
      )}
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
  // Widget types already on the dashboard — hidden, not shown disabled.
  existingTypes: Set<string>;
  onAdd: (widgetType: string) => void;
  // Used for previews once hasEnoughDataForPreviews is true (see
  // domain/constants.ts:MIN_LOGGED_DAYS_FOR_REAL_PREVIEWS).
  realBundle: WidgetDataBundle;
  realToday: string;
  hasEnoughDataForPreviews: boolean;
}) {
  const available = WIDGET_DEFINITIONS.filter((d) => !existingTypes.has(d.type));

  // Resolved once for the whole grid, not per widget.
  const previewBundle = hasEnoughDataForPreviews ? realBundle : MOCK_CHART_DATA_BUNDLE;
  const previewToday = hasEnoughDataForPreviews ? realToday : MOCK_TODAY;

  // Mounting 20+ live charts in one commit blocks the backdrop's own
  // fade-in; revealing them in small batches per frame keeps it smooth.
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
    // Extra frame lets the dialog's own open-transition land first.
    frameId = requestAnimationFrame(() => revealNextBatch(0));

    // Resets on close/unmount so the next open starts from skeletons again.
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      setReadyCount(0);
    };
  }, [open, available.length]);

  // Reveal order is just index into `available`, not visual grid order.
  const revealOrder = new Map(available.map((d, i) => [d.type, i]));
  const isPreviewReady = (type: string) =>
    (revealOrder.get(type) ?? available.length) < readyCount;

  // Adding a widget makes the dashboard behind the dialog mount a whole new
  // live chart, which takes long enough that the click felt unregistered.
  const [addingType, setAddingType] = useState<string | null>(null);

  // Clear the flag once the widget lands — its card leaves `available`, so a
  // stale type would otherwise keep any re-added card stuck on "Adding…".
  if (addingType != null && existingTypes.has(addingType)) {
    setAddingType(null);
  }

  function handleAdd(widgetType: string) {
    setAddingType(widgetType);
    // Urgent above, deferred here: React paints "Adding…" first and keeps the
    // card on screen while it commits the expensive grid update, instead of
    // batching both into one late render where the feedback never shows.
    startTransition(() => onAdd(widgetType));
  }

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

                  // Stacked charts get a separate grid so their taller
                  // preview box doesn't stretch single-panel rows.
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
                              onAdd={handleAdd}
                              loading={!isPreviewReady(def.type)}
                              adding={addingType === def.type}
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
                                onAdd={handleAdd}
                                loading={!isPreviewReady(def.type)}
                                adding={addingType === def.type}
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

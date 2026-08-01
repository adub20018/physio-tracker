// Renders one dashboard's widgets, and owns its edit mode. Desktop/tablet
// uses react-grid-layout for real drag/resize; mobile skips it entirely and
// uses move-up/move-down buttons instead — a freeform multi-column resize
// grid doesn't mean anything on a narrow phone screen, and drag-resize
// handles are unreliable on small touchscreens anyway.
//
// Edit mode holds a local working copy (`draft`) of the widget list,
// snapshotted from the server-loaded `widgets` prop when editing starts.
// Save persists it via a Server Action and refreshes; Cancel just drops the
// draft and goes back to reading `widgets` directly — no effect needed to
// keep the two in sync, since only one of them is ever read at a time.
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ReactGridLayout, {
  useContainerWidth,
  type Layout,
} from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Button } from "@primereact/ui/button";
import { Message } from "@primereact/ui/message";
import { Pencil, Plus, ChevronUp, ChevronDown } from "lucide-react";
import { useMediaQuery } from "@/lib/use-media-query";
import { ButtonSpinner } from "@/components/ui/shared/button-spinner";
import type { ChartDataBundle } from "@/domain/dashboard-bundle";
import type { DashboardWidget, NewDashboardWidgetInput } from "@/repositories";
import { WIDGET_REGISTRY } from "./widget-registry";
import { WidgetShell } from "./widget-shell";
import { AddWidgetDialog } from "./add-widget-dialog";
import { saveDashboardLayout } from "@/app/(app)/dashboard/[dashboardId]/actions";
import styles from "./dashboard-grid.module.css";

// Matches the tablet breakpoint used elsewhere in the app's own CSS for
// switching from a stacked to a grid-like layout.
const DESKTOP_QUERY = "(min-width: 44rem)";

function sortForDisplay(widgets: DashboardWidget[]): DashboardWidget[] {
  return [...widgets].sort((a, b) => a.y - b.y || a.x - b.x);
}

function nextY(widgets: DashboardWidget[]): number {
  return widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0);
}

export function DashboardGrid({
  dashboardId,
  widgets,
  bundle,
  today,
  autoScaleYAxis,
}: {
  dashboardId: string;
  widgets: DashboardWidget[];
  bundle: ChartDataBundle;
  today: string;
  autoScaleYAxis: boolean;
}) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const { width, containerRef, mounted } = useContainerWidth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<DashboardWidget[]>(widgets);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = isEditing ? draft : widgets;
  // Drop any widget whose type isn't (or is no longer) in the registry —
  // keeps `layout` and the rendered children in exact 1:1 correspondence,
  // which react-grid-layout expects.
  const known = active.filter((w) => WIDGET_REGISTRY[w.widgetType]);
  const existingTypes = new Set(known.map((w) => w.widgetType));

  function startEdit() {
    setDraft(widgets);
    setError(null);
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setError(null);
  }

  function handleSave() {
    setError(null);
    const payload: NewDashboardWidgetInput[] = draft.map(
      ({ widgetType, x, y, w, h }) => ({ widgetType, x, y, w, h }),
    );
    startTransition(async () => {
      const result = await saveDashboardLayout(dashboardId, payload);
      if (result.ok) {
        setIsEditing(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function addWidget(widgetType: string) {
    const definition = WIDGET_REGISTRY[widgetType];
    if (!definition) return;
    setDraft((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        widgetType,
        x: 0,
        y: nextY(prev),
        w: definition.defaultSize.w,
        h: definition.defaultSize.h,
      },
    ]);
  }

  function removeWidget(id: string) {
    setDraft((prev) => prev.filter((w) => w.id !== id));
  }

  // Swaps the FULL (x, y) position between two adjacent-in-display-order
  // widgets, not just y — several widgets can share the same y (e.g. the 4
  // stat tiles side by side), so y alone doesn't always define a strict
  // order to move within.
  function moveWidget(id: string, direction: -1 | 1) {
    setDraft((prev) => {
      const sorted = sortForDisplay(prev);
      const index = sorted.findIndex((w) => w.id === id);
      const swapIndex = index + direction;
      if (index < 0 || swapIndex < 0 || swapIndex >= sorted.length) return prev;
      const a = sorted[index];
      const b = sorted[swapIndex];
      return prev.map((w) => {
        if (w.id === a.id) return { ...w, x: b.x, y: b.y };
        if (w.id === b.id) return { ...w, x: a.x, y: a.y };
        return w;
      });
    });
  }

  function handleLayoutChange(layout: Layout) {
    setDraft((prev) =>
      prev.map((w) => {
        const item = layout.find((l) => l.i === w.id);
        return item ? { ...w, x: item.x, y: item.y, w: item.w, h: item.h } : w;
      }),
    );
  }

  const layout: Layout = known.map((w) => ({
    i: w.id,
    x: w.x,
    y: w.y,
    w: w.w,
    h: w.h,
  }));
  const sorted = sortForDisplay(known);

  return (
    <>
      <div className={styles.controls}>
        {isEditing ? (
          <>
            <Button
              variant="outlined"
              severity="secondary"
              size="small"
              onClick={() => setAddOpen(true)}
            >
              <Plus size={14} /> Add widget
            </Button>
            <div className={styles.editActions}>
              <Button
                variant="outlined"
                severity="secondary"
                size="small"
                onClick={cancelEdit}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button size="small" onClick={handleSave} disabled={isPending}>
                {isPending ? (
                  <>
                    <ButtonSpinner />
                    Saving…
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </>
        ) : (
          <Button
            variant="outlined"
            severity="secondary"
            size="small"
            onClick={startEdit}
          >
            <Pencil size={14} /> Edit dashboard
          </Button>
        )}
      </div>

      {error && (
        <Message.Root severity="error" size="small" className={styles.error}>
          <Message.Content>
            <Message.Text>{error}</Message.Text>
          </Message.Content>
        </Message.Root>
      )}

      {!isDesktop ? (
        <div className={styles.mobileStack}>
          {sorted.map((widget, index) => (
            <div key={widget.id} className={styles.mobileItem}>
              {isEditing && (
                <div className={styles.mobileMoveControls}>
                  <button
                    type="button"
                    className={styles.moveButton}
                    onClick={() => moveWidget(widget.id, -1)}
                    disabled={index === 0}
                    aria-label="Move up"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    type="button"
                    className={styles.moveButton}
                    onClick={() => moveWidget(widget.id, 1)}
                    disabled={index === sorted.length - 1}
                    aria-label="Move down"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
              )}
              <div className={styles.mobileItemContent}>
                <WidgetShell
                  definition={WIDGET_REGISTRY[widget.widgetType]}
                  bundle={bundle}
                  ctx={{ widgetId: widget.id, today, autoScaleYAxis }}
                  editMode={isEditing}
                  onRemove={() => removeWidget(widget.id)}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div ref={containerRef} className={styles.gridContainer}>
          {mounted && (
            <ReactGridLayout
              layout={layout}
              width={width}
              gridConfig={{ cols: 12, rowHeight: 20, margin: [16, 16] }}
              dragConfig={{ enabled: isEditing, handle: "[data-drag-handle]" }}
              resizeConfig={{ enabled: isEditing }}
              onLayoutChange={handleLayoutChange}
            >
              {known.map((widget) => (
                <div key={widget.id}>
                  <WidgetShell
                    definition={WIDGET_REGISTRY[widget.widgetType]}
                    bundle={bundle}
                    ctx={{ widgetId: widget.id, today, autoScaleYAxis }}
                    editMode={isEditing}
                    onRemove={() => removeWidget(widget.id)}
                  />
                </div>
              ))}
            </ReactGridLayout>
          )}
        </div>
      )}

      <AddWidgetDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        existingTypes={existingTypes}
        onAdd={addWidget}
      />
    </>
  );
}

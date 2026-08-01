// Renders one dashboard's widgets, and owns its edit mode. Wide screens
// get react-grid-layout for real 2D drag/resize (any widget, any WxH);
// narrow ones fall back to a single-column stack with move-up/move-down
// buttons — a freeform multi-column resize grid doesn't mean anything on
// a phone, and drag-resize handles are unreliable on small touchscreens.
//
// Which of the two renders is decided purely by the CONTAINER's measured
// width (see below), not a viewport media query, and the stack doubles as
// the pre-measurement placeholder, so widgets are never missing.
//
// Edit mode holds a local working copy (`draft`) of the widget list,
// snapshotted from the server-loaded `widgets` prop when editing starts.
// Save persists it via a Server Action and refreshes; Cancel just drops the
// draft and goes back to reading `widgets` directly — no effect needed to
// keep the two in sync, since only one of them is ever read at a time.
"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ReactGridLayout, { type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Button } from "@primereact/ui/button";
import { Message } from "@primereact/ui/message";
import { Pencil, Plus, ChevronUp, ChevronDown } from "lucide-react";
import { ButtonSpinner } from "@/components/ui/shared/button-spinner";
import type { ChartDataBundle } from "@/domain/dashboard-bundle";
import type { DashboardWidget, NewDashboardWidgetInput } from "@/repositories";
import { WIDGET_REGISTRY } from "./widget-registry";
import { WidgetShell } from "./widget-shell";
import { AddWidgetDialog } from "./add-widget-dialog";
import { saveDashboardLayout } from "@/app/(app)/dashboard/[dashboardId]/actions";
import styles from "./dashboard-grid.module.css";

// Below this measured CONTAINER width (not viewport width), fall back to
// the stacked single-column layout. Measuring the container rather than
// the window is the point: the page caps itself at 64rem, so the viewport
// can be far wider than the space the grid actually has to lay out in.
const MIN_GRID_WIDTH = 704; // 44rem, the app's usual tablet breakpoint

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
  // The grid's own width, measured from the container element rather than
  // read off the viewport. Two independent paths set it, deliberately:
  // the ref callback fires the moment the node is attached (giving a
  // correct width on the very first commit, before paint), and the
  // ResizeObserver keeps it current afterwards. Measuring this way also
  // means react-grid-layout is always given the real available width, so
  // items can't be laid out against a wrong/assumed one.
  //
  // This replaces an earlier matchMedia + useSyncExternalStore approach
  // that decided wide-vs-narrow from the viewport. Its server snapshot is
  // necessarily "false" (no viewport to measure while server-rendering),
  // and the client-side correction to the real value never reliably
  // landed — leaving the dashboard stuck on the stacked narrow layout
  // even on a maximized ultra-wide window. Measuring an actual element
  // has no server/client snapshot split to get stuck in.
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number | null>(null);

  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    nodeRef.current = node;
    if (node) setWidth(Math.round(node.clientWidth));
  }, []);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    // observe() fires the callback once immediately, so this also covers
    // the case where the ref callback's measurement was somehow missed.
    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width ?? node.clientWidth;
      setWidth(Math.round(measured));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

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

  // True mobile view, and also the placeholder shown on desktop for the
  // brief window before useContainerWidth's first measurement completes
  // (see the `mounted` branch below) — same content either way, so there's
  // never a moment where the widgets are just gone.
  function renderStack() {
    return (
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
    );
  }

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

      {/* The container is ALWAYS rendered, never behind a conditional —
          it's the element being measured, so if it only mounted once we'd
          already decided to show the grid, the measurement could never
          happen and the decision could never be made. */}
      <div
        ref={setContainerRef}
        className={`${styles.gridContainer} ${isEditing ? styles.editing : ""}`}
      >
        {width != null && width >= MIN_GRID_WIDTH ? (
          <ReactGridLayout
            // react-grid-layout has a long-standing bug (open since 2018,
            // e.g. react-grid-layout/react-grid-layout#756 and #1936):
            // toggling isDraggable/isResizable (dragConfig.enabled /
            // resizeConfig.enabled here) after mount doesn't take effect
            // on already-rendered items — only a forced remount (or, per
            // the reports, a window resize) picks up the new value.
            // Keying on isEditing forces exactly that remount whenever
            // edit mode toggles, so entering/leaving it actually enables
            // or disables drag/resize instead of silently doing nothing.
            key={isEditing ? "editing" : "viewing"}
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
        ) : (
          // Genuinely narrow (phone), or the very first render before the
          // measurement lands. Either way the stack is the right thing to
          // show, so content is never missing while we work it out.
          renderStack()
        )}
      </div>

      <AddWidgetDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        existingTypes={existingTypes}
        onAdd={addWidget}
      />
    </>
  );
}

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
import { Pencil, Plus } from "lucide-react";
import { useMediaQuery } from "@/lib/use-media-query";
import { daysForRange } from "@/lib/time-range";
import { usePersistedTimeRange } from "@/lib/use-persisted-time-range";
import { ButtonSpinner } from "@/components/ui/shared/button-spinner";
import type { ChartDataBundle } from "@/domain/dashboard-bundle";
import type { DashboardWidget, NewDashboardWidgetInput } from "@/repositories";
import { WIDGET_REGISTRY, type WidgetDefinition } from "./widget-registry";
import { WidgetShell } from "./widget-shell";
import { AddWidgetDialog } from "./add-widget-dialog";
import { DashboardConfig } from "./dashboard-config";
import { saveDashboardLayout } from "@/app/(app)/dashboard/[dashboardId]/actions";
import styles from "./dashboard-grid.module.css";

// Matches the tablet breakpoint used elsewhere in the app's own CSS for
// switching from a stacked to a grid-like layout.
const DESKTOP_QUERY = "(min-width: 44rem)";

// A widget spanning h rows is h*ROW_HEIGHT + (h-1)*verticalMargin tall, so
// one row step is ROW_HEIGHT + verticalMargin = 20px. Deliberately fine:
// the vertical gutter has to stay wide enough to separate cards (12px),
// and since it's charged per row step, a *large* row height is what makes
// resizing coarse. Small rows + that gutter give 20px granularity while
// still letting a stat tile land on its natural ~120px content height
// (h=7 → 128px) instead of being forced to a much taller multiple.
const ROW_HEIGHT = 8;
const GRID_MARGIN: [number, number] = [16, 12];

function sortForDisplay(widgets: DashboardWidget[]): DashboardWidget[] {
  return [...widgets].sort((a, b) => a.y - b.y || a.x - b.x);
}

function nextY(widgets: DashboardWidget[]): number {
  return widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0);
}

// Mobile reflows into two columns rather than replaying the desktop grid:
// stat tiles take one column each so they pair up 2x2, and everything else
// spans both. A chart squeezed into half a phone's width is unreadable
// whatever the user set on desktop, so only stat tiles get a say — and even
// they go full width if deliberately made wider than half the desktop grid.
function mobileSpansHalf(
  widget: DashboardWidget,
  definition: WidgetDefinition,
): boolean {
  return Boolean(definition.bare) && widget.w <= 6;
}

export function DashboardGrid({
  dashboardId,
  dashboardName,
  widgets,
  bundle,
  today,
  autoScaleYAxis,
}: {
  dashboardId: string;
  dashboardName: string;
  widgets: DashboardWidget[];
  bundle: ChartDataBundle;
  today: string;
  autoScaleYAxis: boolean;
}) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  // measureBeforeMount: without it useContainerWidth starts `mounted` true
  // while `width` is still its hardcoded 1280px default, so the very first
  // paint lays the grid out at 1280 regardless of the real container width
  // — inside this page's 64rem column that puts full-width widgets a couple
  // of hundred pixels off the right edge. Passing it makes `mounted` stay
  // false until a real measurement exists, which is what the {mounted && …}
  // gate below is for (and what react-grid-layout's own README recommends
  // for server-rendered pages).
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
  });
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Keyed per dashboard: each is its own view of a period, so switching
  // dashboards shouldn't drag the last one's range along with it.
  const [range, setRange] = usePersistedTimeRange(
    `physimate:dashboard-range:${dashboardId}`,
  );
  const rangeDays = daysForRange(range);

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

  // Each item carries its widget type's own size bounds, so react-grid-layout
  // clamps the resize live rather than letting a chart be dragged down to an
  // unreadable sliver or a fixed-height stat tile be stretched.
  const layout: Layout = known.map((w) => {
    const { bounds } = WIDGET_REGISTRY[w.widgetType];
    return {
      i: w.id,
      x: w.x,
      y: w.y,
      w: w.w,
      h: w.h,
      minW: bounds.minW,
      maxW: bounds.maxW,
      minH: bounds.minH,
      maxH: bounds.maxH,
    };
  });
  const sorted = sortForDisplay(known);

  return (
    <>
      <div className={styles.controls}>
        <div className={styles.controlsLeft}>
          {isEditing ? (
            <Button
              variant="outlined"
              severity="secondary"
              size="small"
              onClick={() => setAddOpen(true)}
            >
              <Plus size={14} /> Add widget
            </Button>
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

        <div className={styles.controlsRight}>
          {isEditing && (
            <>
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
            </>
          )}
          <DashboardConfig
            dashboardId={dashboardId}
            dashboardName={dashboardName}
            range={range}
            onRangeChange={setRange}
            // A reset replaces the saved widgets, so any edit draft still
            // open is now stale — drop it rather than let a later Save
            // write the pre-reset layout straight back.
            onReset={() => setIsEditing(false)}
          />
        </div>
      </div>

      {error && (
        <Message.Root severity="error" size="small" className={styles.error}>
          <Message.Content>
            <Message.Text>{error}</Message.Text>
          </Message.Content>
        </Message.Root>
      )}

      {/* The measured container is rendered unconditionally, even on
          mobile where there's no grid inside it. useContainerWidth's effect
          bails out if its ref isn't attached yet and only re-runs when
          `measureWidth` changes identity — so if this div first appeared
          later (when isDesktop flipped true), nothing would ever measure it
          and `mounted` would stay false forever, leaving the grid branch
          rendering nothing at all. */}
      <div
        ref={containerRef}
        className={
          isDesktop && isEditing
            ? `${styles.gridContainer} ${styles.editing}`
            : styles.gridContainer
        }
      >
        {!isDesktop ? (
          <div className={styles.mobileStack}>
            {sorted.map((widget, index) => (
              <div
                key={widget.id}
                className={
                  mobileSpansHalf(widget, WIDGET_REGISTRY[widget.widgetType])
                    ? styles.mobileHalf
                    : styles.mobileFull
                }
              >
                <WidgetShell
                  definition={WIDGET_REGISTRY[widget.widgetType]}
                  bundle={bundle}
                  ctx={{
                    widgetId: widget.id,
                    today,
                    rangeDays,
                    autoScaleYAxis,
                    // No definite cell height on mobile — the row sizes
                    // itself from the content, so charts and tiles render
                    // at their natural heights and can grow when text wraps.
                    fillHeight: false,
                  }}
                  editMode={isEditing}
                  onRemove={() => removeWidget(widget.id)}
                  move={{
                    onUp: () => moveWidget(widget.id, -1),
                    onDown: () => moveWidget(widget.id, 1),
                    canMoveUp: index > 0,
                    canMoveDown: index < sorted.length - 1,
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          mounted && (
            <ReactGridLayout
              layout={layout}
              width={width}
              gridConfig={{ cols: 12, rowHeight: ROW_HEIGHT, margin: GRID_MARGIN }}
              dragConfig={{ enabled: isEditing, handle: "[data-drag-handle]" }}
              resizeConfig={{ enabled: isEditing }}
              onLayoutChange={handleLayoutChange}
            >
              {known.map((widget) => (
                <div key={widget.id}>
                  <WidgetShell
                    definition={WIDGET_REGISTRY[widget.widgetType]}
                    bundle={bundle}
                    ctx={{
                      widgetId: widget.id,
                      today,
                      rangeDays,
                      autoScaleYAxis,
                      fillHeight: true,
                    }}
                    editMode={isEditing}
                    onRemove={() => removeWidget(widget.id)}
                  />
                </div>
              ))}
            </ReactGridLayout>
          )
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

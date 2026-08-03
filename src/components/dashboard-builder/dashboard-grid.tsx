// Renders one dashboard's widgets, and owns its edit mode. Both desktop and
// mobile use react-grid-layout — the underlying react-draggable and
// react-resizable handle touch as well as mouse, so the same
// press-and-drag / pull-the-corner gestures work on a phone.
//
// What differs is the grid itself, not the interaction: 12 columns on
// desktop, 2 on a phone, and a separate stored placement per widget for
// each. A width that reads well across 12 columns is meaningless across 2,
// so arranging one breakpoint deliberately leaves the other alone.
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
import { absoluteStrategy } from "react-grid-layout/core";

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
const GRID_MARGIN: [number, number] = [12, 12];

const DESKTOP_COLS = 12;
// Two columns on a phone: enough for stat tiles to sit 2-up, and coarse
// enough that no widget can be dragged to a width that isn't readable.
const MOBILE_COLS = 2;
const MOBILE_MARGIN: [number, number] = [12, 12];

// The two layouts are stored per widget and arranged independently — a size
// that reads well across 12 desktop columns means nothing across 2. These
// pick whichever set of fields the current breakpoint edits.
type Placement = { x: number; y: number; w: number; h: number };

function placementOf(
  widget: DashboardWidget,
  definition: WidgetDefinition,
  isDesktop: boolean,
): Placement {
  if (isDesktop) {
    return { x: widget.x, y: widget.y, w: widget.w, h: widget.h };
  }
  // Mobile coordinates are null until the user actually rearranges there,
  // so fall back to the widget's default mobile size at a position derived
  // from its desktop order (assignMobilePositions fills in y/x).
  return {
    x: widget.mobileX ?? 0,
    y: widget.mobileY ?? 0,
    w: widget.mobileW ?? definition.mobileDefaultSize.w,
    h: widget.mobileH ?? definition.mobileDefaultSize.h,
  };
}

// Gives any widget still missing a mobile position one, by walking the
// desktop reading order and packing left-to-right: a half-width widget
// pairs with the next half-width one, anything full-width takes its own
// row. Only used for widgets whose mobileY is null — once a layout has
// been saved on mobile, the stored values win.
function assignMobilePositions(
  widgets: DashboardWidget[],
  placements: Map<string, Placement>,
): void {
  let y = 0;
  let xCursor = 0;
  for (const widget of [...widgets].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const placement = placements.get(widget.id);
    if (!placement) continue;
    if (widget.mobileY != null) {
      // Already arranged on mobile — respect it, and keep packing below it.
      y = Math.max(y, placement.y + placement.h);
      xCursor = 0;
      continue;
    }
    if (placement.w >= MOBILE_COLS) {
      if (xCursor > 0) {
        y += 1;
        xCursor = 0;
      }
      placement.x = 0;
      placement.y = y;
      y += placement.h;
    } else {
      placement.x = xCursor;
      placement.y = y;
      xCursor += placement.w;
      if (xCursor >= MOBILE_COLS) {
        y += placement.h;
        xCursor = 0;
      }
    }
  }
}

function nextY(widgets: DashboardWidget[], isDesktop: boolean): number {
  return widgets.reduce(
    (max, w) =>
      isDesktop
        ? Math.max(max, w.y + w.h)
        : Math.max(max, (w.mobileY ?? 0) + (w.mobileH ?? 0)),
    0,
  );
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
  const [savedWidgets, setSavedWidgets] = useState<DashboardWidget[]>(widgets);
  const [draft, setDraft] = useState<DashboardWidget[]>(widgets);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = isEditing ? draft : savedWidgets;
  // Drop any widget whose type isn't (or is no longer) in the registry —
  // keeps `layout` and the rendered children in exact 1:1 correspondence,
  // which react-grid-layout expects.
  const known = active.filter((w) => WIDGET_REGISTRY[w.widgetType]);
  const existingTypes = new Set(known.map((w) => w.widgetType));

  function startEdit() {
    setDraft(savedWidgets);
    setError(null);
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setError(null);
  }

  function handleSave() {
    setError(null);
    // Both layouts go back every time: whichever breakpoint was being
    // edited updated its own fields, and the other's ride along untouched.
    const payload: NewDashboardWidgetInput[] = draft.map(
      ({ widgetType, x, y, w, h, mobileX, mobileY, mobileW, mobileH }) => ({
        widgetType,
        x,
        y,
        w,
        h,
        mobileX,
        mobileY,
        mobileW,
        mobileH,
      }),
    );
    startTransition(async () => {
      const result = await saveDashboardLayout(dashboardId, payload);
      if (result.ok) {
        setSavedWidgets(draft);
        setIsEditing(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  // Seeds a placement for BOTH breakpoints, not just the one being edited —
  // otherwise a widget added on a phone would have no desktop position (and
  // vice versa) and would land on top of something over there.
  function addWidget(widgetType: string) {
    const definition = WIDGET_REGISTRY[widgetType];
    if (!definition) return;
    setDraft((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        widgetType,
        x: 0,
        y: nextY(prev, true),
        w: definition.defaultSize.w,
        h: definition.defaultSize.h,
        mobileX: 0,
        mobileY: nextY(prev, false),
        mobileW: definition.mobileDefaultSize.w,
        mobileH: definition.mobileDefaultSize.h,
      },
    ]);
  }

  function removeWidget(id: string) {
    setDraft((prev) => prev.filter((w) => w.id !== id));
  }

  // Writes only the breakpoint currently on screen, leaving the other
  // layout's stored coordinates alone — that separation is the whole point
  // of keeping two of them.
  function handleLayoutChange(layout: Layout) {
    setDraft((prev) =>
      prev.map((w) => {
        const item = layout.find((l) => l.i === w.id);
        if (!item) return w;
        return isDesktop
          ? { ...w, x: item.x, y: item.y, w: item.w, h: item.h }
          : {
              ...w,
              mobileX: item.x,
              mobileY: item.y,
              mobileW: item.w,
              mobileH: item.h,
            };
      }),
    );
  }

  // Resolve every widget's placement for the breakpoint on screen, filling
  // in any widget that has no mobile position saved yet.
  const placements = new Map<string, Placement>(
    known.map((w) => [
      w.id,
      placementOf(w, WIDGET_REGISTRY[w.widgetType], isDesktop),
    ]),
  );
  if (!isDesktop) assignMobilePositions(known, placements);

  // Each item carries its widget type's own size bounds for this breakpoint,
  // so react-grid-layout clamps the resize live rather than letting a chart
  // be dragged down to an unreadable sliver or a stat tile be squeezed
  // below the height its wrapped content needs.
  const layout: Layout = known.map((w) => {
    const definition = WIDGET_REGISTRY[w.widgetType];
    const bounds = isDesktop ? definition.bounds : definition.mobileBounds;
    const placement = placements.get(w.id)!;
    return {
      i: w.id,
      ...placement,
      minW: bounds.minW,
      maxW: bounds.maxW,
      minH: bounds.minH,
      maxH: bounds.maxH,
    };
  });

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

      {/* The measured container is rendered unconditionally. Its effect
          bails out if its ref isn't attached yet and only re-runs when
          `measureWidth` changes identity — so if this div only appeared
          once some other state flipped, nothing would ever measure it and
          `mounted` would stay false forever, rendering nothing at all. */}
      <div
        ref={containerRef}
        className={
          isEditing
            ? `${styles.gridContainer} ${styles.editing}`
            : styles.gridContainer
        }
      >
        {mounted && (
          <ReactGridLayout
            positionStrategy={absoluteStrategy} // Safari incorrectly positions portal tooltips when grid items use transform positioning. Absolute positioning fixes this
            layout={layout}
            width={width}
            gridConfig={{
              cols: isDesktop ? DESKTOP_COLS : MOBILE_COLS,
              rowHeight: ROW_HEIGHT,
              margin: isDesktop ? GRID_MARGIN : MOBILE_MARGIN,
              containerPadding: [0, 0],
            }}
            // react-draggable/react-resizable (which react-grid-layout is
            // built on) handle touch as well as mouse, so the same
            // press-the-handle-and-drag and pull-the-corner gestures work
            // on a phone — the handles just need touch-action: none so the
            // browser scrolls the page instead of stealing the gesture.
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

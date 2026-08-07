// Renders one dashboard's widgets and owns its edit mode. Desktop (12 cols) and mobile (2 cols)
// store independent placements per widget; edit mode works on a local `draft` copy until Save/Cancel.
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
import { LayoutDashboard, Pencil, Plus } from "lucide-react";
import { useMediaQuery } from "@/lib/use-media-query";
import { daysForRange, type TimeRange } from "@/lib/time-range";
import { ButtonSpinner } from "@/components/ui/shared/button-spinner";
import type { ChartDataBundle } from "@/domain/dashboard-bundle";
import type { DashboardWidget, NewDashboardWidgetInput } from "@/repositories";
import { WIDGET_REGISTRY, type WidgetDefinition } from "./widget-registry";
import { WidgetShell } from "./widget-shell";
import { AddWidgetDialog } from "./add-widget-dialog";
import { DashboardConfig } from "./dashboard-config";
import { DashboardTimerangeButton } from "./dashboard-timerange-button";
import {
  saveDashboardLayout,
  updateDashboardTimeRange,
} from "@/app/(app)/dashboard/[dashboardId]/actions";
import styles from "./dashboard-grid.module.css";
import { absoluteStrategy } from "react-grid-layout/core";

// Matches the tablet breakpoint used elsewhere in the app's CSS.
const DESKTOP_QUERY = "(min-width: 44rem)";

// One row step = ROW_HEIGHT + verticalMargin = 20px — fine-grained on
// purpose so resizing isn't coarse.
const ROW_HEIGHT = 8;
const GRID_MARGIN: [number, number] = [12, 12];

const DESKTOP_COLS = 12;
// 2 columns: stat tiles sit 2-up, coarse enough to stay readable.
const MOBILE_COLS = 2;
const MOBILE_MARGIN: [number, number] = [12, 12];

// Placement fields for whichever breakpoint is currently being edited.
type Placement = { x: number; y: number; w: number; h: number };

function placementOf(
  widget: DashboardWidget,
  definition: WidgetDefinition,
  isDesktop: boolean,
): Placement {
  if (isDesktop) {
    return { x: widget.x, y: widget.y, w: widget.w, h: widget.h };
  }
  // Null until the user rearranges on mobile — fall back to default size.
  return {
    x: widget.mobileX ?? 0,
    y: widget.mobileY ?? 0,
    w: widget.mobileW ?? definition.mobileDefaultSize.w,
    h: widget.mobileH ?? definition.mobileDefaultSize.h,
  };
}

// Packs widgets missing a mobile position left-to-right in desktop reading
// order; saved mobile positions always win.
function fillMissingMobilePositions(
  widgets: DashboardWidget[],
): Map<string, Placement> {
  const placements = new Map<string, Placement>();

  for (const widget of [...widgets].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const definition = WIDGET_REGISTRY[widget.widgetType];

    if (widget.mobileY != null) {
      placements.set(widget.id, {
        x: widget.mobileX!,
        y: widget.mobileY!,
        w: widget.mobileW!,
        h: widget.mobileH!,
      });
      continue;
    }

    const position = findNextPosition(
      widgets.filter((w) => placements.has(w.id)),
      definition.mobileDefaultSize.w,
      definition.mobileDefaultSize.h,
      MOBILE_COLS,
      (w) => placements.get(w.id)!,
    );

    placements.set(widget.id, {
      ...position,
      w: definition.mobileDefaultSize.w,
      h: definition.mobileDefaultSize.h,
    });
  }

  return placements;
}

function findNextPosition(
  widgets: DashboardWidget[],
  w: number,
  h: number,
  cols: number,
  getPlacement: (widget: DashboardWidget) => Placement,
): { x: number; y: number } {
  const occupied = widgets.map(getPlacement);

  let y = 0;

  while (true) {
    for (let x = 0; x <= cols - w; x++) {
      const overlaps = occupied.some(
        (item) =>
          x < item.x + item.w &&
          x + w > item.x &&
          y < item.y + item.h &&
          y + h > item.y,
      );

      if (!overlaps) {
        return { x, y };
      }
    }
    y++;
  }
}

export function DashboardGrid({
  dashboardId,
  dashboardName,
  widgets,
  bundle,
  today,
  autoScaleYAxis,
  initialRange,
  hasEnoughDataForPreviews,
}: {
  dashboardId: string;
  dashboardName: string;
  widgets: DashboardWidget[];
  bundle: ChartDataBundle;
  today: string;
  autoScaleYAxis: boolean;
  // Server-loaded (dashboards.timeRange) so the first paint is correct.
  initialRange: TimeRange;
  // See domain/constants.ts:MIN_LOGGED_DAYS_FOR_REAL_PREVIEWS — false falls
  // back to the mock account in the Add-widget picker.
  hasEnoughDataForPreviews: boolean;
}) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  // measureBeforeMount avoids laying out at the 1280px default before the
  // real container width is known.
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
  });
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [range, setRangeState] = useState<TimeRange>(initialRange);
  const rangeDays = daysForRange(range);

  // Updates locally right away, persists in the background — not wrapped
  // in the edit-mode transition above so it doesn't drive the Save button.
  function handleRangeChange(next: TimeRange) {
    setRangeState(next);
    updateDashboardTimeRange(dashboardId, next).then((result) => {
      if (!result.ok) {
        console.error("Failed to save dashboard time range:", result.error);
      }
    }, (err: unknown) => {
      console.error("Failed to save dashboard time range:", err);
    });
  }

  const [isEditing, setIsEditing] = useState(false);
  const [savedWidgets, setSavedWidgets] = useState<DashboardWidget[]>(widgets);
  const [draft, setDraft] = useState<DashboardWidget[]>(widgets);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = isEditing ? draft : savedWidgets;
  // Drop unknown widget types so `layout` and rendered children stay 1:1.
  const known = active.filter((w) => WIDGET_REGISTRY[w.widgetType]);
  const isEmpty = known.length === 0;
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
    // Both breakpoints' fields go back every time; only one was edited.
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

  // Seeds a placement for both breakpoints, not just the one being edited.
  function addWidget(widgetType: string) {
    const definition = WIDGET_REGISTRY[widgetType];
    if (!definition) return;
    setDraft((prev) => {
      const desktopPosition = findNextPosition(
        prev,
        definition.defaultSize.w,
        definition.defaultSize.h,
        DESKTOP_COLS,
        (widget) => ({
          x: widget.x,
          y: widget.y,
          w: widget.w,
          h: widget.h,
        }),
      );

      const mobilePosition = findNextPosition(
        prev,
        definition.mobileDefaultSize.w,
        definition.mobileDefaultSize.h,
        MOBILE_COLS,
        (widget) => ({
          x: widget.mobileX ?? 0,
          y: widget.mobileY ?? 0,
          w: widget.mobileW ?? definition.mobileDefaultSize.w,
          h: widget.mobileH ?? definition.mobileDefaultSize.h,
        }),
      );

      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          widgetType,

          x: desktopPosition.x,
          y: desktopPosition.y,
          w: definition.defaultSize.w,
          h: definition.defaultSize.h,

          mobileX: mobilePosition.x,
          mobileY: mobilePosition.y,
          mobileW: definition.mobileDefaultSize.w,
          mobileH: definition.mobileDefaultSize.h,
        },
      ];
    });
  }

  function removeWidget(id: string) {
    setDraft((prev) => prev.filter((w) => w.id !== id));
  }

  // Writes only the breakpoint on screen; the other stays untouched.
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

  // Placement for every widget on the current breakpoint.
  const placements = isDesktop
    ? new Map<string, Placement>(
        known.map((w) => [
          w.id,
          placementOf(w, WIDGET_REGISTRY[w.widgetType], true),
        ]),
      )
    : fillMissingMobilePositions(known);

  // Bounds per item so react-grid-layout clamps resize drags live.
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
          {isEditing && (
            <Button
              variant="outlined"
              severity="secondary"
              size="small"
              onClick={() => setAddOpen(true)}
            >
              <Plus size={14} /> Add widget
            </Button>
          )}
        </div>

        {/* Always [calendar] [edit dashboard / cancel+save] [settings] — settings stays hard right. */}
        <div className={styles.controlsRight}>
          <DashboardTimerangeButton range={range} onRangeChange={handleRangeChange} />
          {isEditing ? (
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
          <DashboardConfig
            dashboardId={dashboardId}
            dashboardName={dashboardName}
            // Drop any open edit draft — it's stale after a reset.
            onReset={(widgets) => {
              setSavedWidgets(widgets);
              setDraft(widgets);
              setIsEditing(false);
            }}
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

      {/* Rendered unconditionally so useContainerWidth's ref always attaches. */}
      <div
        ref={containerRef}
        className={
          isEditing
            ? `${styles.gridContainer} ${styles.editing}`
            : styles.gridContainer
        }
      >
        {isEmpty ? (
          <>
            <div className={styles.emptyDashboard}>
              <div>
                <LayoutDashboard size={20} className={styles.emptyMessage} />
                <p className={styles.emptyMessageTitle}>No widgets yet</p>
                <p className={styles.emptyMessage}>
                  Add a widget to customize your dashboard
                </p>
              </div>
              <Button
                severity="primary"
                onClick={() => {
                  setIsEditing(true);
                  setAddOpen(true);
                }}
              >
                <Plus size={14} /> Add widget
              </Button>
            </div>
          </>
        ) : (
          mounted && (
            <ReactGridLayout
              positionStrategy={absoluteStrategy} // fixes Safari portal tooltip positioning
              layout={layout}
              width={width}
              gridConfig={{
                cols: isDesktop ? DESKTOP_COLS : MOBILE_COLS,
                rowHeight: ROW_HEIGHT,
                margin: isDesktop ? GRID_MARGIN : MOBILE_MARGIN,
                containerPadding: [0, 0],
              }}
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
        realBundle={bundle}
        realToday={today}
        hasEnoughDataForPreviews={hasEnoughDataForPreviews}
      />
    </>
  );
}

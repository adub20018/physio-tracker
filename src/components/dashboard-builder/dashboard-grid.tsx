// Renders one dashboard's saved widgets. Desktop/tablet uses
// react-grid-layout for real grid positioning; mobile skips it entirely and
// just stacks every widget full-width in y order — a freeform multi-column
// resize grid doesn't mean anything on a narrow phone screen, so there's no
// grid math to do there even for viewing. Read-only for now (Phase B):
// dragging/resizing/adding/removing widgets comes with edit mode later.
"use client";

import ReactGridLayout, {
  useContainerWidth,
  type Layout,
} from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useMediaQuery } from "@/lib/use-media-query";
import type { ChartDataBundle } from "@/domain/dashboard-bundle";
import type { DashboardWidget } from "@/repositories";
import { WIDGET_REGISTRY } from "./widget-registry";
import { WidgetShell } from "./widget-shell";
import styles from "./dashboard-grid.module.css";

// Matches the tablet breakpoint used elsewhere in the app's own CSS for
// switching from a stacked to a grid-like layout.
const DESKTOP_QUERY = "(min-width: 44rem)";

export function DashboardGrid({
  widgets,
  bundle,
  today,
  autoScaleYAxis,
}: {
  widgets: DashboardWidget[];
  bundle: ChartDataBundle;
  today: string;
  autoScaleYAxis: boolean;
}) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const { width, containerRef, mounted } = useContainerWidth();

  // Drop any widget whose type isn't (or is no longer) in the registry —
  // keeps `layout` and the rendered children in exact 1:1 correspondence,
  // which react-grid-layout expects.
  const known = widgets.filter((w) => WIDGET_REGISTRY[w.widgetType]);

  if (!isDesktop) {
    const sorted = [...known].sort((a, b) => a.y - b.y || a.x - b.x);
    return (
      <div className={styles.mobileStack}>
        {sorted.map((widget) => (
          <WidgetShell
            key={widget.id}
            definition={WIDGET_REGISTRY[widget.widgetType]}
            bundle={bundle}
            ctx={{ widgetId: widget.id, today, autoScaleYAxis }}
          />
        ))}
      </div>
    );
  }

  const layout: Layout = known.map((w) => ({
    i: w.id,
    x: w.x,
    y: w.y,
    w: w.w,
    h: w.h,
  }));

  return (
    <div ref={containerRef} className={styles.gridContainer}>
      {mounted && (
        <ReactGridLayout
          layout={layout}
          width={width}
          gridConfig={{ cols: 12, rowHeight: 20, margin: [16, 16] }}
          dragConfig={{ enabled: false }}
          resizeConfig={{ enabled: false }}
        >
          {known.map((widget) => (
            <div key={widget.id}>
              <WidgetShell
                definition={WIDGET_REGISTRY[widget.widgetType]}
                bundle={bundle}
                ctx={{ widgetId: widget.id, today, autoScaleYAxis }}
              />
            </div>
          ))}
        </ReactGridLayout>
      )}
    </div>
  );
}

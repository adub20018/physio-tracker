// Live thumbnail of one widget type, rendered against the fixed mock
// account (widget-preview-data.ts) for the Add-widget picker. Reuses each
// definition's own `render` — there is no separate "preview mode" chart
// variant — inside a box with a definite height, since every fillHeight
// chart (and StatTile's sparkline) sizes itself via height:100% against its
// parent and collapses without one.
"use client";

import { Skeleton } from "@primereact/ui/skeleton";
import { isStackedChart, type WidgetDefinition } from "./widget-registry";
import { MOCK_CHART_DATA_BUNDLE, mockRenderContext } from "./widget-preview-data";
import styles from "./widget-preview.module.css";

export function WidgetPreview({
  definition,
  loading = false,
}: {
  definition: WidgetDefinition;
  // True for the first frame after the dialog opens (see AddWidgetDialog):
  // renders PrimeReact's own Skeleton instead of calling `render` at all,
  // so mounting ~20+ real chart instances doesn't happen in the same paint
  // as the dialog's own open transition.
  loading?: boolean;
}) {
  // Bare widgets (stat tiles) are already a complete self-styled unit, so
  // they get the same height:100%-flex-child wrapper WidgetShell's
  // .fillBare gives them on the real dashboard, not the card-look box
  // below. Non-bare widgets return chrome-free chart content, meant to sit
  // inside a card frame here matching the real WidgetShell's .card — taller
  // for stacked (multi-panel) charts, whose 2-3 panels are unreadable
  // squeezed into a single-panel-sized box.
  const boxClass = definition.bare
    ? styles.previewBare
    : isStackedChart(definition)
      ? styles.previewChartStacked
      : styles.previewChart;

  if (loading) {
    // width/height 100% fills whichever fixed-size box the definition maps
    // to above — .previewBare's `> * { flex: 1 }` rule stretches it to fill
    // that box's height too, same as the real content would.
    return (
      <div className={boxClass}>
        <Skeleton width="100%" height="100%" />
      </div>
    );
  }

  const ctx = mockRenderContext(definition.type);
  const content = definition.render(MOCK_CHART_DATA_BUNDLE, ctx);

  return <div className={boxClass}>{content}</div>;
}

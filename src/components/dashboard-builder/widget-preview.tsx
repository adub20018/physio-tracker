// Live thumbnail of one widget type for the Add-widget picker. Reuses each
// definition's own `render` — there is no separate "preview mode" chart
// variant — inside a box with a definite height, since every fillHeight
// chart (and StatTile's sparkline) sizes itself via height:100% against its
// parent and collapses without one.
//
// Source-agnostic: `bundle`/`today` are resolved once by the caller
// (add-widget-dialog.tsx), which picks either the signed-in user's own data
// or the fabricated mock account depending on how much real history exists
// — this component doesn't know or care which it got.
"use client";

import { Skeleton } from "@primereact/ui/skeleton";
import { isStackedChart, type WidgetDefinition } from "./widget-registry";
import { previewRenderContext } from "./widget-preview-data";
import type { ChartDataBundle } from "@/domain/dashboard-bundle";
import styles from "./widget-preview.module.css";

export function WidgetPreview({
  definition,
  loading = false,
  bundle,
  today,
}: {
  definition: WidgetDefinition;
  // True for the first frame after the dialog opens (see AddWidgetDialog):
  // renders PrimeReact's own Skeleton instead of calling `render` at all,
  // so mounting ~20+ real chart instances doesn't happen in the same paint
  // as the dialog's own open transition.
  loading?: boolean;
  // Already resolved to either the real account or the mock one — see
  // add-widget-dialog.tsx.
  bundle: ChartDataBundle;
  today: string;
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

  const ctx = previewRenderContext(definition.type, today);
  const content = definition.render(bundle, ctx);

  return <div className={boxClass}>{content}</div>;
}

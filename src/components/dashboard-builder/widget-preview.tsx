// Live thumbnail of one widget type for the Add-widget picker. Reuses the definition's own
// `render` in a box with a definite height (fillHeight charts collapse without one); source-agnostic since bundle/today are resolved by the caller.
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
  // True for the first frame after the dialog opens: renders a Skeleton instead of calling
  // `render`, so mounting ~20+ real charts doesn't happen in the same paint as the dialog's open transition.
  loading?: boolean;
  // Already resolved to either the real account or the mock one — see add-widget-dialog.tsx.
  bundle: ChartDataBundle;
  today: string;
}) {
  // Bare widgets (stat tiles) get the same height:100%-flex-child wrapper as WidgetShell's
  // .fillBare; non-bare widgets sit in a card frame matching WidgetShell's .card, taller when stacked.
  const boxClass = definition.bare
    ? styles.previewBare
    : isStackedChart(definition)
      ? styles.previewChartStacked
      : styles.previewChart;

  if (loading) {
    // Fills whichever fixed-size box `boxClass` maps to above (.previewBare's
    // `> * { flex: 1 }` stretches it to that box's height too), same as the real content would.
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

// Frames one widget instance for display, reusing the exact .card/
// .cardHeader/.cardTitle classes every existing dashboard/insights chart
// section already uses, so a saved dashboard looks identical to the
// hardcoded pages it replaces. Stat tiles are "bare" (already a complete,
// self-styled unit with their own internal InfoTooltip) — this shell skips
// its own card wrapper for those rather than double-framing them.
import { Info } from "lucide-react";
import { InfoTooltip } from "@/components/ui/shared/info-tooltip";
import type { ChartDataBundle } from "@/domain/dashboard-bundle";
import type { WidgetDefinition, WidgetRenderContext } from "./widget-registry";
import styles from "@/components/ui/dashboard/dashboard.module.css";

export function WidgetShell({
  definition,
  bundle,
  ctx,
}: {
  definition: WidgetDefinition;
  bundle: ChartDataBundle;
  ctx: WidgetRenderContext;
}) {
  const content = definition.render(bundle, ctx);

  if (definition.bare) {
    return content;
  }

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>{definition.label}</h2>
        {definition.hint && (
          <InfoTooltip text={definition.hint} label="What does this chart show?">
            <Info size={14} />
          </InfoTooltip>
        )}
      </div>
      {content}
    </section>
  );
}

// Frames one widget instance for display, reusing the exact .card/
// .cardHeader/.cardTitle classes every existing dashboard/insights chart
// section already uses, so a saved dashboard looks identical to the
// hardcoded pages it replaces. Stat tiles are "bare" (already a complete,
// self-styled unit with their own internal InfoTooltip) — this shell skips
// its own card wrapper for those rather than double-framing them.
//
// In edit mode, adds a drag handle (a `[data-drag-handle]` element —
// dashboard-grid.tsx points react-grid-layout's dragConfig.handle at that
// selector, so dragging only starts from here, not from clicking anywhere
// on the chart itself) and a remove button. Bare widgets get a minimal top
// strip carrying just those two controls, since they have no header slot.
import { GripVertical, X, Info } from "lucide-react";
import { InfoTooltip } from "@/components/ui/shared/info-tooltip";
import type { ChartDataBundle } from "@/domain/dashboard-bundle";
import type { WidgetDefinition, WidgetRenderContext } from "./widget-registry";
import cardStyles from "@/components/ui/dashboard/dashboard.module.css";
import styles from "./widget-shell.module.css";

function DragHandle() {
  return (
    <span
      data-drag-handle
      className={styles.dragHandle}
      role="button"
      aria-label="Drag to move"
      tabIndex={-1}
    >
      <GripVertical size={14} />
    </span>
  );
}

function RemoveButton({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <button
      type="button"
      className={styles.removeButton}
      onClick={onRemove}
      aria-label={`Remove ${label}`}
    >
      <X size={14} />
    </button>
  );
}

export function WidgetShell({
  definition,
  bundle,
  ctx,
  editMode = false,
  onRemove,
}: {
  definition: WidgetDefinition;
  bundle: ChartDataBundle;
  ctx: WidgetRenderContext;
  editMode?: boolean;
  onRemove?: () => void;
}) {
  const content = definition.render(bundle, ctx);

  if (definition.bare) {
    if (!editMode) return content;
    return (
      <div className={styles.bareEditWrapper}>
        <div className={styles.bareEditBar}>
          <DragHandle />
          <RemoveButton label={definition.label} onRemove={onRemove} />
        </div>
        {content}
      </div>
    );
  }

  return (
    <section className={cardStyles.card}>
      <div className={cardStyles.cardHeader}>
        <h2 className={cardStyles.cardTitle}>{definition.label}</h2>
        <div className={styles.headerActions}>
          {definition.hint && (
            <InfoTooltip text={definition.hint} label="What does this chart show?">
              <Info size={14} />
            </InfoTooltip>
          )}
          {editMode && (
            <>
              <DragHandle />
              <RemoveButton label={definition.label} onRemove={onRemove} />
            </>
          )}
        </div>
      </div>
      {content}
    </section>
  );
}

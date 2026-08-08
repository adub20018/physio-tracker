// Frames one widget instance, reusing the shared .card classes; "bare" stat tiles skip
// the card wrapper. Edit mode adds a drag handle (`[data-drag-handle]`, matched by dashboard-grid.tsx's dragConfig.handle) + remove button in place, so nothing resizes.
import { GripVertical, X, Info } from "lucide-react";
import { InfoTooltip } from "@/components/ui/shared/info-tooltip";
import type { WidgetDataBundle } from "@/lib/widget-data";
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

function RemoveButton({
  label,
  onRemove,
}: {
  label: string;
  onRemove?: () => void;
}) {
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
  bundle: WidgetDataBundle;
  ctx: WidgetRenderContext;
  editMode?: boolean;
  onRemove?: () => void;
}) {
  const fill = ctx.fillHeight;
  const editControls = editMode ? (
    <>
      <DragHandle />
      <RemoveButton label={definition.label} onRemove={onRemove} />
    </>
  ) : undefined;

  // Bare widgets (stat tiles) place controls inside their own header, swapping them for
  // the icon badge (StatTile's `actions` prop) — keeps the tile the same height in/out of edit mode.
  const content = definition.render(
    bundle,
    definition.bare ? { ...ctx, editControls } : ctx,
  );

  if (definition.bare) {
    return fill ? <div className={styles.fillBare}>{content}</div> : content;
  }

  return (
    <section
      className={
        fill ? `${cardStyles.card} ${styles.fillCard}` : cardStyles.card
      }
    >
      <div className={cardStyles.cardHeader}>
        <h2 className={cardStyles.cardTitle}>{definition.label}</h2>
        <div className={styles.headerActions}>
          {definition.hint && (
            <InfoTooltip
              text={definition.hint}
              label="What does this chart show?"
            >
              <Info size={14} />
            </InfoTooltip>
          )}
          {editMode && <span className={styles.actions}>{editControls}</span>}
        </div>
      </div>
      {fill ? <div className={styles.fillBody}>{content}</div> : content}
    </section>
  );
}

// Frames one widget instance for display, reusing the exact .card/
// .cardHeader/.cardTitle classes every existing dashboard/insights chart
// section already uses, so a saved dashboard looks identical to the
// hardcoded pages it replaces. Stat tiles are "bare" (already a complete,
// self-styled unit with their own internal InfoTooltip) — this shell skips
// its own card wrapper for those rather than double-framing them.
//
// In edit mode the shell adds its own controls, always inside the widget's
// existing header so nothing changes size between viewing and editing:
//   - desktop: a drag handle (a `[data-drag-handle]` element —
//     dashboard-grid.tsx points react-grid-layout's dragConfig.handle at
//     that selector, so dragging only starts here, not from anywhere on the
//     chart) plus a remove button.
//   - mobile: move-up/move-down instead of the handle, since the mobile
//     layout is an ordered reflow rather than a draggable grid. Keeping
//     them in the header (rather than in a column beside the card) matters
//     most there: a half-width stat tile has no horizontal room to spare.
import { GripVertical, X, Info, ChevronUp, ChevronDown } from "lucide-react";
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
  move,
}: {
  definition: WidgetDefinition;
  bundle: ChartDataBundle;
  ctx: WidgetRenderContext;
  editMode?: boolean;
  onRemove?: () => void;
  // Supplied by the mobile layout, which reorders instead of dragging.
  // When present, up/down buttons replace the drag handle.
  move?: {
    onUp: () => void;
    onDown: () => void;
    canMoveUp: boolean;
    canMoveDown: boolean;
  };
}) {
  const fill = ctx.fillHeight;
  const editControls = editMode ? (
    <>
      {move ? (
        <>
          <button
            type="button"
            className={styles.moveButton}
            onClick={move.onUp}
            disabled={!move.canMoveUp}
            aria-label={`Move ${definition.label} earlier`}
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            className={styles.moveButton}
            onClick={move.onDown}
            disabled={!move.canMoveDown}
            aria-label={`Move ${definition.label} later`}
          >
            <ChevronDown size={14} />
          </button>
        </>
      ) : (
        <DragHandle />
      )}
      <RemoveButton label={definition.label} onRemove={onRemove} />
    </>
  ) : undefined;

  // Bare widgets (stat tiles) place the controls inside their own header,
  // swapping them for the icon badge — see StatTile's `actions` prop. Doing
  // it that way instead of stacking a control bar above the tile is what
  // keeps the tile exactly the same height in edit mode as out of it.
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
            <InfoTooltip text={definition.hint} label="What does this chart show?">
              <Info size={14} />
            </InfoTooltip>
          )}
          {editControls}
        </div>
      </div>
      {fill ? <div className={styles.fillBody}>{content}</div> : content}
    </section>
  );
}

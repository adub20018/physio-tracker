// Edit-mode "Add widget" picker — lists every widget type not already on
// the dashboard, grouped by category. Follows ConfirmDialog's Dialog.Root/
// Portal/Backdrop/Positioner/Popup structure (src/components/ui/shared/
// confirm-dialog.tsx) but stays open after each pick, so several widgets
// can be added in one pass rather than reopening the dialog each time.
"use client";

import { Dialog } from "@primereact/ui/dialog";
import { Button } from "@primereact/ui/button";
import { X } from "lucide-react";
import { WIDGET_DEFINITIONS, type WidgetCategory } from "./widget-registry";
import styles from "./add-widget-dialog.module.css";

const CATEGORIES: WidgetCategory[] = [
  "Stat tiles",
  "Dashboard charts",
  "Insights charts",
];

export function AddWidgetDialog({
  open,
  onOpenChange,
  existingTypes,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Widget types already on the dashboard — hidden from the picker rather
  // than shown disabled, since a second identical chart isn't useful.
  existingTypes: Set<string>;
  onAdd: (widgetType: string) => void;
}) {
  const available = WIDGET_DEFINITIONS.filter((d) => !existingTypes.has(d.type));

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e: { value?: boolean }) => onOpenChange(e.value ?? false)}
      modal
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Popup className={styles.popup}>
            <Dialog.Header>
              <Dialog.Title>Add widget</Dialog.Title>
              <Dialog.HeaderActions>
                <Dialog.Close
                  aria-label="Close"
                  as={Button}
                  iconOnly
                  variant="text"
                  rounded
                  severity="secondary"
                >
                  <X size={16} />
                </Dialog.Close>
              </Dialog.HeaderActions>
            </Dialog.Header>
            <Dialog.Content className={styles.content}>
              {available.length === 0 ? (
                <p className={styles.empty}>
                  Every available widget is already on this dashboard.
                </p>
              ) : (
                CATEGORIES.map((category) => {
                  const items = available.filter((d) => d.category === category);
                  if (items.length === 0) return null;
                  return (
                    <div key={category} className={styles.group}>
                      <h3 className={styles.groupTitle}>{category}</h3>
                      <div className={styles.rows}>
                        {items.map((def) => (
                          <button
                            key={def.type}
                            type="button"
                            className={styles.row}
                            onClick={() => onAdd(def.type)}
                          >
                            {def.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </Dialog.Content>
          </Dialog.Popup>
        </Dialog.Positioner>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

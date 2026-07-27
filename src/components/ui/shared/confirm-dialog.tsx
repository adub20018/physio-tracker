// A generic "are you sure" modal for destructive actions — used by the
// Privacy page's Delete all data / Delete account buttons, and reusable
// wherever else a confirmed destructive action is needed later.
"use client";

import { Dialog } from "@primereact/ui/dialog";
import { Button } from "@primereact/ui/button";
import { Message } from "@primereact/ui/message";
import { Times } from "@primeicons/react/times";
import { ButtonSpinner } from "./button-spinner";
import styles from "./confirm-dialog.module.css";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  isPending,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  isPending: boolean;
  error?: string | null;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e: { value?: boolean }) => onOpenChange(e.value ?? false)}
      modal
      dismissable={!isPending}
      closeOnEscape={!isPending}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Popup className={styles.popup}>
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.HeaderActions>
                <Dialog.Close
                  aria-label="Cancel"
                  disabled={isPending}
                  as={Button}
                  iconOnly
                  variant="text"
                  rounded
                  severity="secondary"
                >
                  <Times size={16} />
                </Dialog.Close>
              </Dialog.HeaderActions>
            </Dialog.Header>
            <Dialog.Content className={styles.content}>
              <p>{description}</p>
              {error && (
                <Message.Root severity="error" size="small">
                  <Message.Content>
                    <Message.Text>{error}</Message.Text>
                  </Message.Content>
                </Message.Root>
              )}
            </Dialog.Content>
            <Dialog.Footer className={styles.footer}>
              <Button
                severity="secondary"
                variant="outlined"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                severity="danger"
                onClick={onConfirm}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <ButtonSpinner />
                    Deleting…
                  </>
                ) : (
                  confirmLabel
                )}
              </Button>
            </Dialog.Footer>
          </Dialog.Popup>
        </Dialog.Positioner>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

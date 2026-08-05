// A small "type a name and confirm" modal — the text-input counterpart to ConfirmDialog.
// Used for both creating and renaming a dashboard, which differ only in title/label/starting value.
"use client";

import { useState } from "react";
import { Dialog } from "@primereact/ui/dialog";
import { Button } from "@primereact/ui/button";
import { InputText } from "@primereact/ui/inputtext";
import { Message } from "@primereact/ui/message";
import { Times } from "@primeicons/react/times";
import { ButtonSpinner } from "./button-spinner";
import styles from "./name-dialog.module.css";

export function NameDialog({
  open,
  onOpenChange,
  title,
  label,
  placeholder,
  initialValue = "",
  confirmLabel,
  pendingLabel,
  onConfirm,
  isPending,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  label: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel: string;
  pendingLabel: string;
  onConfirm: (name: string) => void;
  isPending: boolean;
  error?: string | null;
}) {
  const [value, setValue] = useState(initialValue);

  // Reset field on open, adjusted during render rather than an effect — React's documented
  // way to reset state on a prop change without tripping react-hooks/set-state-in-effect.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setValue(initialValue);
  }

  const trimmed = value.trim();

  function submit() {
    if (trimmed.length > 0 && !isPending) onConfirm(trimmed);
  }

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
              <label className={styles.label} htmlFor="name-dialog-input">
                {label}
              </label>
              <InputText
                id="name-dialog-input"
                className={styles.input}
                value={value}
                placeholder={placeholder}
                disabled={isPending}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setValue(e.target.value)
                }
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submit();
                  }
                }}
              />
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
                onClick={submit}
                disabled={isPending || trimmed.length === 0}
              >
                {isPending ? (
                  <>
                    <ButtonSpinner />
                    {pendingLabel}
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

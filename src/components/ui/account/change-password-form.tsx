// Change-password form for /account/security. Uses Better Auth's
// client-side changePassword() — it re-verifies the current password itself,
// so (unlike a forgotten-password reset) this needs no email provider and
// can ship now.
"use client";

import { useEffect, useState } from "react";
import { Label } from "@primereact/ui/label";
import { Button } from "@primereact/ui/button";
import { Message } from "@primereact/ui/message";
import { auth } from "@/auth/client";
import { PasswordField } from "@/components/ui/shared/password-field";
import styles from "./account-form.module.css";

const MIN_PASSWORD_LENGTH = 7;
// How long to wait, after the user stops typing in either password field,
// before flagging a mismatch — long enough that mid-typing states (the
// confirm field trailing behind the one just edited) don't flash red. Same
// pattern as the sign-up form.
const CONFIRM_PASSWORD_DEBOUNCE_MS = 500;

type FieldErrors = {
  newPassword?: string;
  confirmPassword?: string;
};

function validate(newPassword: string, confirmPassword: string): FieldErrors {
  const errors: FieldErrors = {};
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    errors.newPassword = `Needs at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (confirmPassword !== newPassword) {
    errors.confirmPassword = "Passwords don't match.";
  }
  return errors;
}

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Live confirm-password check: re-runs whenever either password field
  // changes, but only applies its result after a pause in typing, so a
  // correction in progress doesn't flash invalid before it's finished.
  useEffect(() => {
    // Empty field clears instantly (nothing to be wrong about yet); a
    // non-empty one waits out the debounce before it can flag a mismatch.
    const delay = confirmPassword === "" ? 0 : CONFIRM_PASSWORD_DEBOUNCE_MS;
    const timer = setTimeout(() => {
      setErrors((prev) => ({
        ...prev,
        confirmPassword:
          confirmPassword === "" || confirmPassword === newPassword
            ? undefined
            : "Passwords don't match.",
      }));
    }, delay);
    return () => clearTimeout(timer);
  }, [newPassword, confirmPassword]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);

    const fieldErrors = validate(newPassword, confirmPassword);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      setGeneralError(null);
      return;
    }

    setIsSaving(true);
    setErrors({});
    setGeneralError(null);
    try {
      const result = await auth.changePassword({ currentPassword, newPassword });
      if (result.error) {
        setGeneralError(result.error.message ?? "Couldn't change your password.");
        return;
      }
      setSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Change password failed: ", err);
      setGeneralError("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className={styles.card} onSubmit={save}>
      <div className={styles.field}>
        <Label htmlFor="current-password" className={styles.fieldLabel}>
          Current password
        </Label>
        <PasswordField
          id="current-password"
          autoComplete="current-password"
          value={currentPassword}
          onValueChange={(v) => {
            setCurrentPassword(v);
            setGeneralError(null);
            setSaved(false);
          }}
        />
      </div>
      <div className={styles.field}>
        <Label htmlFor="new-password" className={styles.fieldLabel}>
          New password
        </Label>
        <PasswordField
          id="new-password"
          autoComplete="new-password"
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          invalid={!!errors.newPassword}
          value={newPassword}
          onValueChange={(v) => {
            setNewPassword(v);
            setErrors((prev) => ({
              ...prev,
              newPassword: undefined,
              confirmPassword: undefined,
            }));
            setGeneralError(null);
            setSaved(false);
          }}
        />
        {errors.newPassword && (
          <span className={styles.fieldError}>{errors.newPassword}</span>
        )}
      </div>
      <div className={styles.field}>
        <Label htmlFor="confirm-new-password" className={styles.fieldLabel}>
          Confirm new password
        </Label>
        <PasswordField
          id="confirm-new-password"
          autoComplete="new-password"
          placeholder="Re-enter your new password"
          invalid={!!errors.confirmPassword}
          value={confirmPassword}
          onValueChange={(v) => {
            setConfirmPassword(v);
            setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            setGeneralError(null);
            setSaved(false);
          }}
        />
        {errors.confirmPassword && (
          <span className={styles.fieldError}>{errors.confirmPassword}</span>
        )}
      </div>
      <div className={styles.actions}>
        {generalError && <span className={styles.fieldError}>{generalError}</span>}
        {saved && !generalError && (
          <Message.Root severity="success" size="small">
            <Message.Content>
              <Message.Text>Password changed.</Message.Text>
            </Message.Content>
          </Message.Root>
        )}
        <Button type="submit" disabled={isSaving} fluid size="large" severity="contrast">
          {isSaving ? "Saving…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}

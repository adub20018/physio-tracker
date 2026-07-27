// Change-password form for /account/security. Uses Better Auth's
// client-side changePassword() — it re-verifies the current password itself,
// so (unlike a forgotten-password reset) this needs no email provider and
// can ship now.
"use client";

import { useState } from "react";
import { Label } from "@primereact/ui/label";
import { Button } from "@primereact/ui/button";
import { Message } from "@primereact/ui/message";
import { auth } from "@/auth/client";
import { PasswordField } from "./password-field";
import styles from "./account-form.module.css";

const MIN_PASSWORD_LENGTH = 7;

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`New password needs at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const result = await auth.changePassword({ currentPassword, newPassword });
      if (result.error) {
        setError(result.error.message ?? "Couldn't change your password.");
        return;
      }
      setSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Change password failed: ", err);
      setError("Something went wrong. Please try again.");
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
            setError(null);
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
          value={newPassword}
          onValueChange={(v) => {
            setNewPassword(v);
            setError(null);
            setSaved(false);
          }}
        />
      </div>
      <div className={styles.field}>
        <Label htmlFor="confirm-new-password" className={styles.fieldLabel}>
          Confirm new password
        </Label>
        <PasswordField
          id="confirm-new-password"
          autoComplete="new-password"
          value={confirmPassword}
          onValueChange={(v) => {
            setConfirmPassword(v);
            setError(null);
            setSaved(false);
          }}
        />
      </div>
      <div className={styles.actions}>
        {error && <span className={styles.fieldError}>{error}</span>}
        {saved && !error && (
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

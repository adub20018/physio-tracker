// Profile form for /account/profile: editable name; email is display-only (needs an email
// provider this app doesn't have). Name saves via Better Auth's client-side updateUser(), not a server action, since it's Neon Auth's own record.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InputText } from "@primereact/ui/inputtext";
import { Label } from "@primereact/ui/label";
import { Button } from "@primereact/ui/button";
import { Message } from "@primereact/ui/message";
import { auth } from "@/auth/client";
import { ButtonSpinner } from "@/components/ui/shared/button-spinner";
import styles from "./account-form.module.css";

export function EditProfileForm({
  initialName,
  email,
}: {
  initialName: string;
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed === "") {
      setError("Enter a name.");
      setSaved(false);
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      const result = await auth.updateUser({ name: trimmed });
      if (result.error) {
        setError(result.error.message ?? "Couldn't update your name.");
        return;
      }
      setSaved(true);
      // The nav's AccountMenu reads the name from the server session.
      router.refresh();
    } catch (err) {
      console.error("Update name failed: ", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className={styles.card} onSubmit={save}>
      <div className={styles.field}>
        <Label htmlFor="profile-name" className={styles.fieldLabel}>
          Name
        </Label>
        <InputText
          id="profile-name"
          type="text"
          autoComplete="name"
          invalid={!!error}
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setName(e.target.value);
            setError(null);
            setSaved(false);
          }}
        />
      </div>
      <div className={styles.field}>
        <Label htmlFor="profile-email" className={styles.fieldLabel}>
          Email
        </Label>
        {/* Display only for now — changing email needs verification, which
            requires an email provider this app doesn't have yet. */}
        <InputText id="profile-email" type="email" value={email} disabled />
      </div>
      <div className={styles.actions}>
        {error && <span className={styles.fieldError}>{error}</span>}
        {saved && !error && (
          <Message.Root severity="success" size="small">
            <Message.Content>
              <Message.Text>Name updated.</Message.Text>
            </Message.Content>
          </Message.Root>
        )}
        <Button type="submit" disabled={isSaving} fluid size="large" severity="contrast">
          {isSaving ? (
            <>
              <ButtonSpinner />
              Saving…
            </>
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </form>
  );
}

// Sign-up form. Validates every field locally before ever calling the auth
// server — all violations show at once (each field gets its own red border
// and message), not just the first one found — and maps the server's own
// error (e.g. email already registered) onto the relevant field too.
"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { InputText } from "@primereact/ui/inputtext";
import { Label } from "@primereact/ui/label";
import { Button } from "@primereact/ui/button";
import { auth } from "@/auth/client";
import { PasswordField } from "@/components/ui/password-field";
import styles from "@/components/ui/auth-form.module.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 7;
// How long to wait, after the user stops typing in either password field,
// before flagging a mismatch — long enough that mid-typing states (the
// confirm field trailing behind the one just edited) don't flash red.
const CONFIRM_PASSWORD_DEBOUNCE_MS = 500;

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

function validate(
  name: string,
  email: string,
  password: string,
  confirmPassword: string,
): FieldErrors {
  const errors: FieldErrors = {};
  if (name.trim() === "") errors.name = "Enter your name.";
  if (email.trim() === "" || !EMAIL_PATTERN.test(email))
    errors.email = "Enter a valid email address.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Needs at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (confirmPassword !== password)
    errors.confirmPassword = "Passwords don't match.";
  return errors;
}

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isPending, startTransition] = useTransition();

  const router = useRouter();

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
          confirmPassword === "" || confirmPassword === password
            ? undefined
            : "Passwords don't match.",
      }));
    }, delay);
    return () => clearTimeout(timer);
  }, [password, confirmPassword]);

  function signup() {
    const fieldErrors = validate(name, email, password, confirmPassword);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    startTransition(async () => {
      const result = await auth.signUp.email({ email, password, name });
      if (result.error) {
        setErrors({
          email: result.error.message ?? "Couldn't create an account.",
        });
        return;
      }
      router.refresh();
      router.replace("/");
    });
  }

  return (
    <main className="page" style={{ maxWidth: "26rem" }}>
      <header className="page-header">
        <h1>Create account</h1>
        <p className="subtitle">Your own private set of logs.</p>
      </header>

      <div className={styles.card}>
        <div className={styles.field}>
          <Label htmlFor="signup-name" className={styles.fieldLabel}>
            Name
          </Label>
          <InputText
            id="signup-name"
            type="text"
            autoComplete="name"
            placeholder="Jane Doe"
            invalid={!!errors.name}
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setName(e.target.value);
              setErrors((prev) => ({ ...prev, name: undefined }));
            }}
          />
          {errors.name && (
            <span className={styles.fieldError}>{errors.name}</span>
          )}
        </div>
        <div className={styles.field}>
          <Label htmlFor="signup-email" className={styles.fieldLabel}>
            Email
          </Label>
          <InputText
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            invalid={!!errors.email}
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setEmail(e.target.value);
              setErrors((prev) => ({ ...prev, email: undefined }));
            }}
          />
          {errors.email && (
            <span className={styles.fieldError}>{errors.email}</span>
          )}
        </div>
        <div className={styles.field}>
          <Label htmlFor="signup-password" className={styles.fieldLabel}>
            Password
          </Label>
          <PasswordField
            id="signup-password"
            autoComplete="new-password"
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            invalid={!!errors.password}
            value={password}
            onValueChange={(value) => {
              setPassword(value);
              setErrors((prev) => ({
                ...prev,
                password: undefined,
                confirmPassword: undefined,
              }));
            }}
          />
          {errors.password && (
            <span className={styles.fieldError}>{errors.password}</span>
          )}
        </div>
        <div className={styles.field}>
          <Label
            htmlFor="signup-confirm-password"
            className={styles.fieldLabel}
          >
            Confirm password
          </Label>
          <PasswordField
            id="signup-confirm-password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            invalid={!!errors.confirmPassword}
            value={confirmPassword}
            onValueChange={(value) => {
              setConfirmPassword(value);
              setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
          />
          {errors.confirmPassword && (
            <span className={styles.fieldError}>{errors.confirmPassword}</span>
          )}
        </div>

        <div className={styles.actions}>
          <Button
            onClick={signup}
            disabled={isPending}
            fluid
            size="large"
            severity="contrast"
          >
            {isPending ? "Creating account…" : "Sign up"}
          </Button>
          <p className={styles.switchLink}>
            Already have an account? <Link href="/login">Log in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

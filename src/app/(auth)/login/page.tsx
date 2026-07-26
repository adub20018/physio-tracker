// Sign-in form. Validates every field locally before ever calling the auth
// server — all violations show at once, each with its own red border and
// message. A rejected email/password can't be attributed to one field, so
// credentialError marks both fields invalid with one shared message under
// password, matching the sign-up page's per-field error styling.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { InputText } from "@primereact/ui/inputtext";
import { Label } from "@primereact/ui/label";
import { Button } from "@primereact/ui/button";
import { auth } from "@/auth/client";
import { PasswordField } from "@/components/ui/password-field";
import styles from "@/components/ui/auth-form.module.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = {
  email?: string;
  password?: string;
};

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (email.trim() === "" || !EMAIL_PATTERN.test(email))
    errors.email = "Enter a valid email address.";
  if (password === "") errors.password = "Enter your password.";
  return errors;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [credentialError, setCredentialError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  async function login() {
    const fieldErrors = validate(email, password);

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      setCredentialError(null);
      return;
    }

    setIsLoading(true);
    setErrors({});
    setCredentialError(null);

    try {
      const result = await auth.signIn.email({ email, password });

      if (result.error) {
        setCredentialError(
          result.error.message ??
            "Couldn't log in — check your email and password.",
        );
        setIsLoading(false);
        return;
      }
      console.log("Successfully logged in");
      router.replace("/");
    } catch (error) {
      console.error("Login failed: ", error);
      setIsLoading(false);
      setCredentialError("Something went wrong. Please try again.");
    }
  }

  function clearError(field: keyof FieldErrors) {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setCredentialError(null);
  }

  return (
    <main className="page" style={{ maxWidth: "26rem" }}>
      <header className="page-header">
        <h1>Log in</h1>
        <p className="subtitle">Welcome back.</p>
      </header>

      <div className={styles.card}>
        <div className={styles.field}>
          <Label htmlFor="login-email" className={styles.fieldLabel}>
            Email
          </Label>
          <InputText
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            invalid={!!errors.email || !!credentialError}
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setEmail(e.target.value);
              clearError("email");
            }}
          />
          {errors.email && (
            <span className={styles.fieldError}>{errors.email}</span>
          )}
        </div>
        <div className={styles.field}>
          <Label htmlFor="login-password" className={styles.fieldLabel}>
            Password
          </Label>
          <PasswordField
            id="login-password"
            autoComplete="current-password"
            placeholder="Password"
            invalid={!!errors.password || !!credentialError}
            value={password}
            onValueChange={(value) => {
              setPassword(value);
              clearError("password");
            }}
          />
          {(errors.password || credentialError) && (
            <span className={styles.fieldError}>
              {errors.password ?? credentialError}
            </span>
          )}
        </div>

        <div className={styles.actions}>
          <Button
            onClick={login}
            disabled={isLoading}
            fluid
            size="large"
            severity="contrast"
          >
            {isLoading ? "Logging in…" : "Log in"}
          </Button>
          <p className={styles.switchLink}>
            Don&apos;t have an account? <Link href="/sign-up">Sign up</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

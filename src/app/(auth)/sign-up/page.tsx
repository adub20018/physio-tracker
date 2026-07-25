// Sign-up form. Validates locally (name required, email format, password
// length, confirm-password match) before ever calling the auth server, and
// shows the server's own error (e.g. email already registered) if it rejects.
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { InputText } from "@primereact/ui/inputtext";
import { InputPassword } from "@primereact/ui/inputpassword";
import { Label } from "@primereact/ui/label";
import { Button } from "@primereact/ui/button";
import { Message } from "@primereact/ui/message";
import { auth } from "@/auth/client";
import styles from "@/components/ui/auth-form.module.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const router = useRouter();

  function signup() {
    if (name.trim() === "") {
      setError("Enter your name.");
      return;
    }
    if (email.trim() === "" || !EMAIL_PATTERN.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await auth.signUp.email({ email, password, name });
      if (result.error) {
        setError(result.error.message ?? "Couldn't create an account.");
        return;
      }
      router.push("/");
      router.refresh();
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
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          />
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
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <Label htmlFor="signup-password" className={styles.fieldLabel}>
            Password
          </Label>
          <InputPassword
            id="signup-password"
            autoComplete="new-password"
            feedback={false}
            toggleMask
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            value={password}
            onValueChange={(e: { value: string | null }) => setPassword(e.value ?? "")}
          />
        </div>
        <div className={styles.field}>
          <Label htmlFor="signup-confirm-password" className={styles.fieldLabel}>
            Confirm password
          </Label>
          <InputPassword
            id="signup-confirm-password"
            autoComplete="new-password"
            feedback={false}
            toggleMask
            placeholder="Re-enter your password"
            value={confirmPassword}
            onValueChange={(e: { value: string | null }) => setConfirmPassword(e.value ?? "")}
          />
        </div>

        <div className={styles.actions}>
          <Button onClick={signup} disabled={isPending} fluid size="large" severity="contrast">
            {isPending ? "Creating account…" : "Sign up"}
          </Button>
          {error && (
            <Message.Root severity="error" size="small">
              <Message.Content>
                <Message.Text>{error}</Message.Text>
              </Message.Content>
            </Message.Root>
          )}
          <p className={styles.switchLink}>
            Already have an account? <Link href="/login">Log in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

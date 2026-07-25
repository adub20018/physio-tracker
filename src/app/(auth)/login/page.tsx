// Sign-in form. Validates locally before ever calling the auth server, and
// shows the server's own error (wrong email/password, etc.) if it rejects.
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

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const router = useRouter();

  function login() {
    if (email.trim() === "" || !EMAIL_PATTERN.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password === "") {
      setError("Enter your password.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await auth.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message ?? "Couldn't log in — check your email and password.");
        return;
      }
      router.push("/");
      router.refresh();
    });
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
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <Label htmlFor="login-password" className={styles.fieldLabel}>
            Password
          </Label>
          <InputPassword
            id="login-password"
            autoComplete="current-password"
            feedback={false}
            toggleMask
            placeholder="Password"
            value={password}
            onValueChange={(e: { value: string | null }) => setPassword(e.value ?? "")}
          />
        </div>

        <div className={styles.actions}>
          <Button onClick={login} disabled={isPending} fluid size="large" severity="contrast">
            {isPending ? "Logging in…" : "Log in"}
          </Button>
          {error && (
            <Message.Root severity="error" size="small">
              <Message.Content>
                <Message.Text>{error}</Message.Text>
              </Message.Content>
            </Message.Root>
          )}
          <p className={styles.switchLink}>
            Don&apos;t have an account? <Link href="/sign-up">Sign up</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

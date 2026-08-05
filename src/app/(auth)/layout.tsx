// Minimal chrome for /login and /sign-up: just the wordmark, no nav or
// account menu. Its own layout since (app)/layout.tsx's AppNav requires a session.
import { Wordmark } from "@/components/ui/nav/wordmark";
import styles from "./layout.module.css";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <header className={styles.header}>
        <Wordmark />
      </header>
      {children}
    </>
  );
}

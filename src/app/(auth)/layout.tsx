// Minimal chrome for /login and /sign-up: just the wordmark, no nav links
// or account menu — those are all dead ends for a signed-out visitor.
// Deliberately its own layout rather than reusing (app)/layout.tsx's
// AppNav, which requires a real session (see PLAN.md §5).
import Link from "next/link";
import styles from "./layout.module.css";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <header className={styles.header}>
        <Link href="/" className={styles.wordmark}>
          physio<em>track</em>
        </Link>
      </header>
      {children}
    </>
  );
}

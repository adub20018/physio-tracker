// Layout for /login and /sign-up: just the wordmark, no nav links and no
// account menu — every link in the main app nav would be a dead end for a
// signed-out visitor, so this is deliberately its own minimal chrome rather
// than reusing (app)/layout.tsx's.
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

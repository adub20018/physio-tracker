// Top navigation bar shown on every page (mounted in the root layout).
// Client component so it can highlight the active route.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./app-nav.module.css";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/log", label: "Log" },
  { href: "/history", label: "History" },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className={styles.nav}>
      {/* Wordmark — the italic serif accent is the app's signature */}
      <Link href="/" className={styles.wordmark}>
        physio<em>track</em>
      </Link>
      <div className={styles.links}>
        {LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`${styles.link} ${pathname === href ? styles.linkActive : ""}`}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

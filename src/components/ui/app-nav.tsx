// Top navigation shown on every authenticated route (mounted in
// (app)/layout.tsx, not the root layout — /login and /sign-up get their
// own minimal chrome instead, since these links are all dead ends for a
// signed-out visitor). Client component so it can highlight the active
// route. The account menu always has a real user: this only ever mounts
// on routes already gated by proxy.ts's middleware.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./app-nav.module.css";
import { AccountMenu } from "./account-menu";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/log", label: "Log" },
  { href: "/insights", label: "Insights" },
  { href: "/history", label: "History" },
];

export function AppNav({ user }: { user: { name: string; email: string } }) {
  const pathname = usePathname();
  return (
    <nav className={styles.nav}>
      {/* Wordmark — the italic serif accent is the app's signature */}
      <Link href="/" className={styles.wordmark}>
        physio<em>track</em>
      </Link>
      {/* Links + account menu are grouped together so .nav's own
          space-between only ever sees two children (wordmark, this group) —
          otherwise a third top-level child gets centered in the middle. */}
      <div className={styles.navEnd}>
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
        <AccountMenu user={user} />
      </div>
    </nav>
  );
}

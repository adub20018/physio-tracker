// Top navigation shown on every authenticated route (mounted in
// (app)/layout.tsx, not the root layout — /login and /sign-up get their
// own minimal chrome instead, since these links are all dead ends for a
// signed-out visitor). Client component so it can highlight the active
// route and drive the mobile hamburger toggle. The account menu always
// has a real user: this only ever mounts on routes already gated by
// proxy.ts's middleware.
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bars } from "@primeicons/react/bars";
import { Times } from "@primeicons/react/times";
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // The links list doesn't fit alongside the logo and account menu at
  // phone widths (see app-nav.module.css's breakpoint), so it collapses
  // into this dropdown instead of the inline row below.
  useEffect(() => {
    if (!isMenuOpen) return;

    function handleOutsideOrEscape(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent) {
        if (e.key === "Escape") setIsMenuOpen(false);
        return;
      }
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideOrEscape);
    document.addEventListener("keydown", handleOutsideOrEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideOrEscape);
      document.removeEventListener("keydown", handleOutsideOrEscape);
    };
  }, [isMenuOpen]);

  return (
    <nav className={styles.nav} ref={navRef}>
      <Link href="/" className={styles.wordmark}>
        {/* Natural size is 65x89 (SVG in /public); fixed height keeps the
            aspect ratio without needing a static import (public/ assets
            aren't processed by the bundler, so they're referenced by URL,
            not import, and don't carry auto-derived dimensions). */}
        <Image src="/physio-tracker-logo.svg" alt="Physio Tracker" width={26} height={36} priority />
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
        <button
          type="button"
          className={styles.hamburger}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? <Times size={20} /> : <Bars size={20} />}
        </button>
        <AccountMenu user={user} />
      </div>
      {isMenuOpen && (
        <div className={styles.mobilePanel}>
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`${styles.mobileLink} ${pathname === href ? styles.mobileLinkActive : ""}`}
              onClick={() => setIsMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

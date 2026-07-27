// Floating shortcut to /log, shown only at phone widths — logging on the
// go is this app's main mobile use case, so a fixed bottom-right button
// skips the extra hamburger-menu step the top nav needs at that width.
// Fixed (not sticky/absolute) so it stays put in the same screen corner
// regardless of scroll position, rather than moving with page content.
// Hidden while already under /log, since it would just point at the
// section already open.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PenToSquare } from "@primeicons/react/pen-to-square";
import styles from "./floating-log-button.module.css";

export function FloatingLogButton() {
  const pathname = usePathname();
  if (pathname.startsWith("/log")) return null;

  return (
    <Link href="/log" className={styles.button} aria-label="Log today's data">
      <PenToSquare size={22} />
    </Link>
  );
}

// Floating shortcut to /log, shown only at phone widths (mobile's main use
// case) — skips the hamburger step the top nav needs. Hidden under /log itself.
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

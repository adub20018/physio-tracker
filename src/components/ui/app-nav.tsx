// Top navigation bar shown on every page (mounted in the root layout).
// Client component so it can highlight the active route.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/log", label: "Log" },
  { href: "/history", label: "History" },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav
      style={{
        display: "flex",
        gap: "0.25rem",
        padding: "0.6rem 1rem",
        borderBottom: "1px solid var(--p-content-border-color, #3f3f46)",
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "var(--background)",
      }}
    >
      {LINKS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: "6px",
              fontWeight: active ? 600 : 400,
              background: active ? "var(--p-highlight-background, #27272a)" : "transparent",
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

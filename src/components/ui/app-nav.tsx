// Top navigation shown on every authenticated route (mounted in
// (app)/layout.tsx, not the root layout — /login and /sign-up get their
// own minimal chrome instead, since these links are all dead ends for a
// signed-out visitor). Client component so it can highlight the active
// route and drive the mobile hamburger toggle. The account menu always
// has a real user: this only ever mounts on routes already gated by
// proxy.ts's middleware.
"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { usePathname } from "next/navigation";
import { AccountMenu, AccountMenuExtended } from "./account-menu";
import { auth } from "@/auth/client";
import { useRouter } from "next/navigation";
import { Menu } from "@primereact/ui/menu";
import { Drawer } from "@primereact/ui/drawer";

// Icons
import { Bars } from "@primeicons/react/bars";
import { Times } from "@primeicons/react/times";
import { ObjectsColumn, SignOut } from "@primeicons/react";
import { PenToSquare } from "@primeicons/react";
import { ChartBar } from "@primeicons/react";
import { History } from "@primeicons/react";
import { Comments } from "@primeicons/react";
import styles from "./app-nav.module.css";

const LINKS = [
  { href: "/", label: "Dashboard", icon: <ObjectsColumn /> },
  { href: "/log", label: "Log", icon: <PenToSquare /> },
  { href: "/insights", label: "Insights", icon: <ChartBar /> },
  { href: "/history", label: "History", icon: <History /> },
];

export function AppNav({ user }: { user: { name: string; email: string } }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  const router = useRouter();

  async function logout() {
    await auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className={styles.nav} ref={navRef}>
      <Link href="/" className={styles.wordmark}>
        {/* Natural size is 65x89 (SVG in /public); fixed height keeps the
            aspect ratio without needing a static import (public/ assets
            aren't processed by the bundler, so they're referenced by URL,
            not import, and don't carry auto-derived dimensions). */}
        <Image
          src="/physio-tracker-logo.svg"
          alt="Physio Tracker"
          width={26}
          height={36}
          priority
        />
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

        {/* Mobile hamburger nav */}
        <Drawer.Root position="right">
          <Drawer.Trigger className={styles.hamburger}>
            <Bars size={26} />
          </Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Backdrop />
            <Drawer.Popup>
              <Drawer.Header>
                <Drawer.Title>PhysioTracker</Drawer.Title>
                <Drawer.Close className={styles.close} variant="text">
                  <Times size={26} />
                </Drawer.Close>
              </Drawer.Header>
              <Drawer.Content>
                <Menu.Root>
                  <Menu.List className={styles.list}>
                    <Menu.Label className={styles.menuLabel}>
                      NAVIGATION
                    </Menu.Label>
                    {LINKS.map(({ href, label, icon }) => (
                      <Menu.Item key={href} className={styles.item}>
                        {icon}
                        <Link
                          key={href}
                          href={href}
                          className={`${styles.link} ${pathname === href ? styles.linkActive : ""}`}
                        >
                          {label}
                        </Link>
                      </Menu.Item>
                    ))}
                    <Menu.Label className={styles.menuLabel}>CHAT</Menu.Label>
                    <Menu.Item className={styles.item}>
                      <Comments />
                      <Link href="/" className={styles.link}>
                        Coming soon
                      </Link>
                    </Menu.Item>
                    <Menu.Label className={styles.menuLabel}>
                      GENERAL
                    </Menu.Label>
                    <Menu.Item onSelect={logout} className={styles.item}>
                      <SignOut />
                      Logout
                    </Menu.Item>
                  </Menu.List>
                </Menu.Root>
              </Drawer.Content>
              <Drawer.Footer>
                <AccountMenuExtended user={user} />
              </Drawer.Footer>
            </Drawer.Popup>
          </Drawer.Portal>
        </Drawer.Root>

        <AccountMenu user={user} />
      </div>
    </nav>
  );
}

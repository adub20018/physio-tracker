// Top navigation shown on every authenticated route (mounted in (app)/layout.tsx, not the root
// layout). Account menu always has a real user since this only mounts on routes gated by proxy.ts.
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "@primereact/ui/menu";
import { Drawer } from "@primereact/ui/drawer";
import { auth } from "@/auth/client";
import { AccountMenu, AccountSummary } from "./account-menu";
import { FloatingLogButton } from "./floating-log-button";
import { Wordmark } from "./wordmark";

// Icons — subpath imports so each pulls in only its own module, not the
// whole icon set.
import { Bars } from "@primeicons/react/bars";
import { Times } from "@primeicons/react/times";
import { ObjectsColumn } from "@primeicons/react/objects-column";
import { PenToSquare } from "@primeicons/react/pen-to-square";
import { History } from "@primeicons/react/history";
import { Comments } from "@primeicons/react/comments";
import { SignOut } from "@primeicons/react/sign-out";
import { UserEdit } from "@primeicons/react/user-edit";
import { SlidersH } from "@primeicons/react/sliders-h";
import { Database } from "@primeicons/react/database";
import { Shield } from "@primeicons/react/shield";
import { Book } from "@primeicons/react/book";
import styles from "./app-nav.module.css";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: <ObjectsColumn /> },
  { href: "/log", label: "Log", icon: <PenToSquare /> },
  { href: "/history", label: "History", icon: <History /> },
];

export function AppNav({ user }: { user: { name: string; email: string } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  async function logout() {
    setIsDrawerOpen(false);
    await auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <nav className={styles.nav}>
        <Link href="/dashboard" className={styles.wordmark}>
          {/* Natural size 65x89; fixed height set manually since public/ assets are
              referenced by URL, not import, so they carry no auto-derived dimensions. */}
          <Image
            src="/PhysiMate-logo.svg"
            alt="PhysiMate"
            width={26}
            height={36}
            priority
          />
        </Link>
        {/* Grouped so .nav's space-between only sees two children — a third would get centered. */}
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

          {/* Desktop-only: hidden on mobile since the drawer's footer/nav already covers identity + logout. */}
          <div className={styles.desktopAccount}>
            <AccountMenu user={user} />
          </div>

          {/* Controlled so nav links and Logout can close it on click; uncontrolled would stay open after navigating away. */}
          <Drawer.Root
            position="right"
            blockScroll
            open={isDrawerOpen}
            onOpenChange={(e: { value?: boolean }) =>
              setIsDrawerOpen(e.value ?? false)
            }
          >
            <Drawer.Trigger className={styles.hamburger} aria-label="Open menu">
              <Bars size={22} />
            </Drawer.Trigger>
            <Drawer.Portal>
              <Drawer.Backdrop />
              <Drawer.Popup className={styles.popup}>
                <Drawer.Header className={styles.drawerHeader}>
                  <Drawer.Title className={styles.drawerTitle}>
                    <Wordmark />
                  </Drawer.Title>
                  <Drawer.Close className={styles.close} aria-label="Close menu">
                    <Times size={18} />
                  </Drawer.Close>
                </Drawer.Header>
                <Menu.Separator className={styles.separatorOuter} />
                <Drawer.Content className={styles.drawerContent}>
                  <Menu.Root>
                    <Menu.List className={styles.list}>
                      <Menu.Label className={styles.menuLabel}>
                        Navigation
                      </Menu.Label>
                      {/* as={Link} composes Menu.Item with real client-side nav; close on `onClick`
                          since Link owns click handling here, so Menu.Item's onSelect never fires. */}
                      {LINKS.map(({ href, label, icon }) => (
                        <Menu.Item
                          key={href}
                          as={Link}
                          href={href}
                          onClick={() => setIsDrawerOpen(false)}
                          className={`${styles.item} ${pathname === href ? styles.itemActive : ""}`}
                        >
                          {icon}
                          <span>{label}</span>
                        </Menu.Item>
                      ))}
                      <Menu.Label className={styles.menuLabel}>Account</Menu.Label>
                      <Menu.Item
                        as={Link}
                        href="/account/profile"
                        onClick={() => setIsDrawerOpen(false)}
                        className={styles.item}
                      >
                        <UserEdit />
                        <span>Profile</span>
                      </Menu.Item>
                      <Menu.Item
                        as={Link}
                        href="/account/preferences"
                        onClick={() => setIsDrawerOpen(false)}
                        className={styles.item}
                      >
                        <SlidersH />
                        <span>Preferences</span>
                      </Menu.Item>
                      <Menu.Item
                        as={Link}
                        href="/account/data"
                        onClick={() => setIsDrawerOpen(false)}
                        className={styles.item}
                      >
                        <Database />
                        <span>Data</span>
                      </Menu.Item>
                      <Menu.Item
                        as={Link}
                        href="/account/security"
                        onClick={() => setIsDrawerOpen(false)}
                        className={styles.item}
                      >
                        <Shield />
                        <span>Account</span>
                      </Menu.Item>
                      <Menu.Item
                        as={Link}
                        href="/definitions"
                        onClick={() => setIsDrawerOpen(false)}
                        className={styles.item}
                      >
                        <Book />
                        <span>Definitions</span>
                      </Menu.Item>
                      <Menu.Label className={styles.menuLabel}>Chat</Menu.Label>
                      <Menu.Item disabled className={styles.item}>
                        <Comments />
                        <span>Coming soon</span>
                      </Menu.Item>
                      <Menu.Separator className={styles.separator} />
                      {/* Not a Link, so its own onSelect fires normally. */}
                      <Menu.Item onSelect={logout} className={styles.item}>
                        <SignOut />
                        <span>Logout</span>
                      </Menu.Item>
                    </Menu.List>
                  </Menu.Root>
                </Drawer.Content>
                <Menu.Separator className={styles.separatorOuter} />
                <Drawer.Footer className={styles.drawerFooter}>
                  <AccountSummary user={user} />
                </Drawer.Footer>
              </Drawer.Popup>
            </Drawer.Portal>
          </Drawer.Root>
        </div>
      </nav>
      <FloatingLogButton />
    </>
  );
}

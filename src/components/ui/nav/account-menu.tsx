// Account identity for the nav: an initials avatar. AccountMenu is the
// desktop dropdown (opens a Menu with name/email + sign-out) shown next to
// the top-bar links; AccountSummary is a plain, non-interactive footer row
// for the mobile drawer, which already has its own "Logout" item in the
// nav list, so it only needs to show who's signed in, not another way to
// sign out. Menu.Trigger is a headless, unstyled <button> re-exported
// straight from the primitive layer (no PrimeReact button chrome) — left
// bare, the browser's native button appearance (grey background, border)
// would show through around the circular avatar, so it's reset via
// .trigger below.
//
// Menu.Root is controlled (open/onOpenChange), and every Link-composed item
// closes it explicitly on click. Necessary because AppNav (and this menu
// inside it) lives in the shared (app) layout, which doesn't remount across
// a client-side navigation — as={Link} composition means Link owns click
// handling, so the item's own onSelect never fires (same finding as the
// mobile drawer in app-nav.tsx) and the menu's default close-on-select never
// kicks in. Left uncontrolled, the popup stayed open (just off in a corner)
// after navigating, and its outside-click dismiss layer swallowed the very
// next click anywhere on the newly-loaded page instead of passing it
// through — the reported "first click after visiting an account page does
// nothing" bug.
//
// closeOnSelect={false} on the same items fixes a second, separate bug:
// PrimeReact's Menu.Item runs its select/close logic on mousedown, not
// click, and — only for items rendered inside Menu.Portal, which these are —
// that mousedown handler calls the popover's setOpen(false) synchronously,
// unmounting the portal (the very <a> mid-click) before the browser's click
// event fires. Link's own router.push() lives in its click handler, so if
// React finishes the unmount first, navigation never happens — an
// intermittent "clicked a menu item, nothing happened" race, since it
// depends on whether the unmount wins the race against the click event.
// closeOnSelect={false} skips that mousedown-triggered close entirely,
// leaving the onClick handlers below (which fire safely after Link's own
// navigation, on the same click event) as the only thing that closes the
// menu. Not needed in app-nav.tsx's mobile drawer: those items aren't
// inside a Menu.Portal, so they never hit this code path.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu } from "@primereact/ui/menu";
import { Avatar } from "@primereact/ui/avatar";
import { auth } from "@/auth/client";
import { SignOut } from "@primeicons/react/sign-out";
import { UserEdit } from "@primeicons/react/user-edit";
import { SlidersH } from "@primeicons/react/sliders-h";
import { Database } from "@primeicons/react/database";
import { Shield } from "@primeicons/react/shield";
import styles from "./account-menu.module.css";

export type AccountUser = { name: string; email: string };

// "Alex Malone" -> "AM"; single-word names use its first two letters.
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Shared circular initials avatar, used by both the trigger below and the
// static drawer summary.
function UserAvatar({ name }: { name: string }) {
  return (
    <Avatar.Root shape="circle">
      <Avatar.Fallback>{initialsOf(name)}</Avatar.Fallback>
    </Avatar.Root>
  );
}

export function AccountMenu({ user }: { user: AccountUser }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  async function logout() {
    setIsOpen(false);
    await auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Menu.Root
      open={isOpen}
      onOpenChange={(e: { value?: boolean }) => setIsOpen(e.value ?? false)}
    >
      <Menu.Trigger className={styles.trigger} aria-label="Account menu">
        <UserAvatar name={user.name} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end">
          <Menu.Popup>
            <Menu.List>
              <Menu.Group>
                <Menu.Label className={styles.accountLabel}>
                  <span className={styles.accountName}>{user.name}</span>
                  <span className={styles.accountEmail}>{user.email}</span>
                </Menu.Label>
              </Menu.Group>
              <Menu.Separator />
              <Menu.Group>
                {/* Not onSelect: Link owns click handling once composed in,
                    so the item's own onSelect never fires — this needs to
                    close the menu itself. */}
                <Menu.Item
                  as={Link}
                  href="/account/profile"
                  closeOnSelect={false}
                  onClick={() => setIsOpen(false)}
                >
                  <UserEdit />
                  Profile
                </Menu.Item>
                <Menu.Item
                  as={Link}
                  href="/account/preferences"
                  closeOnSelect={false}
                  onClick={() => setIsOpen(false)}
                >
                  <SlidersH />
                  Preferences
                </Menu.Item>
                <Menu.Item
                  as={Link}
                  href="/account/data"
                  closeOnSelect={false}
                  onClick={() => setIsOpen(false)}
                >
                  <Database />
                  Data
                </Menu.Item>
                <Menu.Item
                  as={Link}
                  href="/account/security"
                  closeOnSelect={false}
                  onClick={() => setIsOpen(false)}
                >
                  <Shield />
                  Account
                </Menu.Item>
              </Menu.Group>
              <Menu.Separator />
              <Menu.Group>
                {/* Not a Link, so its own onSelect fires normally. */}
                <Menu.Item onSelect={logout}>
                  <SignOut />
                  Logout
                </Menu.Item>
              </Menu.Group>
            </Menu.List>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

// Static identity row for the mobile drawer's footer — avatar, name, and
// email only, no popup. The drawer's nav list already has its own "Logout"
// item, so a second click-to-reveal menu here would just re-show the same
// two lines of text with no new action behind it.
export function AccountSummary({ user }: { user: AccountUser }) {
  return (
    <div className={styles.summary}>
      <UserAvatar name={user.name} />
      <div className={styles.summaryDetails}>
        <span className={styles.summaryName}>{user.name}</span>
        <span className={styles.summaryEmail}>{user.email}</span>
      </div>
    </div>
  );
}

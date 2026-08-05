// Account identity for the nav (desktop dropdown vs. mobile drawer footer row). Menu.Root is
// controlled; closeOnSelect={false} works around a PrimeReact Menu.Portal mousedown/click race — see AGENTS.md's PrimeReact gotchas for the full story.
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
                {/* onClick, not onSelect — see file header. */}
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
                {/* Not a Link — onSelect works normally here. */}
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

// Static identity row for the mobile drawer's footer — no popup needed
// since the drawer's nav list already has its own "Logout" item.
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

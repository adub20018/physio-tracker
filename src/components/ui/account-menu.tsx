// Account dropdown in the nav's top-right: an initials avatar that opens a
// menu with the signed-in user's name/email and a working sign-out. Menu.Trigger
// is a headless, unstyled <button> re-exported straight from the primitive
// layer (no PrimeReact button chrome) — left bare, the browser's native
// button appearance (grey background, border) would show through around
// the circular avatar, so it's reset via .trigger below.
"use client";

import { useRouter } from "next/navigation";
import { Menu } from "@primereact/ui/menu";
import { Avatar } from "@primereact/ui/avatar";
import { auth } from "@/auth/client";
import { SignOut } from "@primeicons/react";
import styles from "./account-menu.module.css";

export type AccountUser = { name: string; email: string };

// "Alex Malone" -> "AM"; single-word names use its first two letters.
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AccountMenu({ user }: { user: AccountUser }) {
  const router = useRouter();

  async function logout() {
    await auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Menu.Root>
      <Menu.Trigger className={styles.trigger} aria-label="Account menu">
        <Avatar.Root shape="circle">
          <Avatar.Fallback>{initialsOf(user.name)}</Avatar.Fallback>
        </Avatar.Root>
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

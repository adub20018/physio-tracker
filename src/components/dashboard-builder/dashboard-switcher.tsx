// The dashboard name in the page header, doubling as a switcher. Menu.Item-as-Link entries use
// closeOnSelect={false} + explicit onClick, since Menu.Portal's default close fires on mousedown and can unmount the <a> before click (see AGENTS.md).
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu } from "@primereact/ui/menu";
import { ChevronDown, Check, Plus } from "lucide-react";
import { NameDialog } from "@/components/ui/shared/name-dialog";
import type { Dashboard } from "@/repositories";
import { createDashboard } from "@/app/(app)/dashboard/[dashboardId]/actions";
import styles from "./dashboard-switcher.module.css";

export function DashboardSwitcher({
  dashboards,
  currentId,
  currentName,
}: {
  dashboards: Dashboard[];
  currentId: string;
  currentName: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function create(name: string) {
    setError(null);
    startTransition(async () => {
      const result = await createDashboard(name);
      if (result.ok) {
        setCreateOpen(false);
        router.push(`/dashboard/${result.dashboardId}`);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <Menu.Root
        open={isOpen}
        onOpenChange={(e: { value?: boolean }) => setIsOpen(e.value ?? false)}
      >
        <h1>
          <Menu.Trigger className={styles.trigger} aria-label="Switch dashboard">
            {currentName}
            <ChevronDown size={18} className={styles.chevron} />
          </Menu.Trigger>
        </h1>
        <Menu.Portal>
          <Menu.Positioner sideOffset={8} align="start">
            <Menu.Popup>
              <Menu.List>
                <Menu.Group>
                  {dashboards.map((d) => (
                    <Menu.Item
                      key={d.id}
                      as={Link}
                      href={`/dashboard/${d.id}`}
                      closeOnSelect={false}
                      onClick={() => setIsOpen(false)}
                      className={d.id === currentId ? styles.currentItem : undefined}
                    >
                      {d.name}
                      {d.id === currentId ? (
                        <Check size={14} className={styles.check} />
                      ) : (
                        <span className={styles.checkSpacer} />
                      )}
                    </Menu.Item>
                  ))}
                </Menu.Group>
                <Menu.Separator />
                <Menu.Group>
                  {/* Not a Link, so its own onSelect fires normally. */}
                  <Menu.Item
                    onSelect={() => {
                      setError(null);
                      setCreateOpen(true);
                    }}
                  >
                    <Plus size={14} />
                    New dashboard
                  </Menu.Item>
                </Menu.Group>
              </Menu.List>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <NameDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New dashboard"
        label="Name"
        placeholder="e.g. Scatter plots"
        confirmLabel="Create"
        pendingLabel="Creating…"
        onConfirm={create}
        isPending={isPending}
        error={error}
      />
    </>
  );
}

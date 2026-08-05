// Wipes logged data while keeping the account — less destructive than
// full account deletion (disabled pending Neon self-service support).
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@primereact/ui/button";
import { deleteAllData } from "@/app/(app)/account/data/actions";
import { ConfirmDialog } from "@/components/ui/shared/confirm-dialog";

export function DeleteDataButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAllData();
      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <Button
        severity="danger"
        variant="outlined"
        onClick={() => setOpen(true)}
      >
        Delete data
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(v) => {
          if (isPending) return;
          setOpen(v);
          if (!v) setError(null);
        }}
        title="Delete all data?"
        description="This permanently deletes every logged day, exercise entry, and app setting. Your account and login stay. This can't be undone."
        confirmLabel="Delete data"
        onConfirm={confirm}
        isPending={isPending}
        error={error}
      />
    </>
  );
}

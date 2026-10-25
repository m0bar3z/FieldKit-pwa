"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskSyncStatus as SyncStatus } from "@/lib/indexed-db/enums";
import { discardTaskChange, retryTaskChange } from "@/lib/products/task-sync";
import type { Task } from "@/lib/products/types";

export function TaskSyncStatus({ task }: { task: Task }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function act(discard: boolean) {
    setBusy(true);
    setError("");
    try {
      if (discard) await discardTaskChange(task);
      else await retryTaskChange(task);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to update this saved task.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (task.syncStatus === SyncStatus.Pending)
    return <Badge variant="secondary">Pending sync</Badge>;
  if (task.syncStatus !== SyncStatus.Failed) return null;
  return (
    <Alert variant="destructive">
      <AlertTitle>
        {task.deletionPending
          ? "This task could not be deleted"
          : "This task could not be synced"}
      </AlertTitle>
      <AlertDescription>
        <p>{task.syncError} Your changes are still saved on this device.</p>
        {error && <p role="alert">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void act(false)}
          >
            Retry sync
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void act(true)}
          >
            {task.deletionPending
              ? "Keep task"
              : task.localOnly
                ? "Discard local task"
                : "Discard local changes"}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { NoteSyncStatus as SyncStatus } from "@/lib/indexed-db/enums";
import { discardNoteEdit, retryNoteEdit } from "@/lib/products/note-sync";
import type { Note } from "@/lib/products/types";

export function NoteSyncStatus({ note }: { note: Note }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleAction(action: "retry" | "discard") {
    setBusy(true);
    setError("");
    try {
      if (action === "retry") await retryNoteEdit(note.id, note.userId);
      else await discardNoteEdit(note.id, note.userId);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to update this saved edit.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (note.syncStatus === SyncStatus.Pending) {
    return (
      <output className="text-sm text-muted-foreground">
        Saved on this device. Waiting to sync.
      </output>
    );
  }
  if (note.syncStatus !== SyncStatus.Failed) return null;

  return (
    <Alert variant="destructive">
      <AlertTitle>This note could not be synced</AlertTitle>
      <AlertDescription>
        <p>{note.syncError}</p>
        <p>
          Your local edit is still saved. Retry, or discard it to load the
          server version.
        </p>
        {error && <p role="alert">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void handleAction("retry")}
          >
            Retry sync
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void handleAction("discard")}
          >
            Discard local edit
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

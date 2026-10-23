"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiRequestError,
  apiRequest,
  WORKSPACE_CHANGED,
} from "@/lib/api/client";
import {
  IndexedDbAction,
  type IndexedDbRecordType,
} from "@/lib/indexed-db/enums";
import { findNotesByAction } from "@/lib/indexed-db/indexed-db";
import { applyNoteEdits } from "@/lib/products/note-edits";
import { readNoteEdits } from "@/lib/products/note-sync";
import type { ItemFormValues } from "@/lib/products/schemas";
import type { Note, Workspace } from "@/lib/products/types";
import { updateAppBadge } from "@/lib/pwa/app-badge";

type StoredItemSubmission = {
  id: number;
  createdAt: number;
  value: {
    kind: "note" | "task";
    action: IndexedDbAction.Create;
    recordType: IndexedDbRecordType.PendingChange;
    payload: ItemFormValues;
  };
};

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((value) => value + 1), []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision is the explicit refetch trigger for API writes and retries.
  useEffect(() => {
    const controller = new AbortController();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    async function loadWorkspace() {
      try {
        const url = `/api/workspace?timeZone=${encodeURIComponent(timeZone)}`;

        if (controller.signal.aborted) return;

        const data = await apiRequest<Workspace>(url, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        const offlineNotes = await findNotesByAction<StoredItemSubmission>(
          IndexedDbAction.Create,
        );
        if (controller.signal.aborted) return;

        const pendingNotes = offlineNotes.flatMap<Note>((item) => {
          const { kind, payload } = item.value;
          if (kind !== "note" || payload.kind !== "note") return [];

          return [
            {
              id: item.id.toString(),
              localId: item.id,
              title: payload.title,
              content: payload.content,
              excerpt: payload.content.slice(0, 240),
              version: 0,
              updated: item.createdAt,
              attachments: [],
            },
          ];
        });
        const notes = applyNoteEdits(
          [...data.notes, ...pendingNotes],
          await readNoteEdits(),
        );
        if (controller.signal.aborted) return;

        setWorkspace({
          ...data,
          notes,
          counts: { ...data.counts, notes: notes.length },
        });

        void updateAppBadge(data.counts.overdue);
        setError("");
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        if (error instanceof ApiRequestError && error.status === 401) {
          void updateAppBadge(0);
          window.location.assign("/login");
          return;
        }

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load your workspace.",
        );
      }
    }

    void loadWorkspace();
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    window.addEventListener(WORKSPACE_CHANGED, retry);
    window.addEventListener("online", retry);
    return () => {
      window.removeEventListener(WORKSPACE_CHANGED, retry);
      window.removeEventListener("online", retry);
    };
  }, [retry]);
  return { workspace, error, retry };
}

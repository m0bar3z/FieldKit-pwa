"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiRequestError,
  apiRequest,
  WORKSPACE_CHANGED,
} from "@/lib/api/client";
import { findNotesByAction } from "@/lib/indexed-db/indexed-db";
import type { ItemFormValues } from "@/lib/products/schemas";
import type { Note, Workspace } from "@/lib/products/types";

type StoredItemSubmission = {
  id: number;
  createdAt: number;
  value: {
    kind: "note" | "task";
    action: "CREATE";
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

        const offlineNotes =
          await findNotesByAction<StoredItemSubmission>("CREATE");
        if (controller.signal.aborted) return;

        const pendingNotes = offlineNotes.flatMap<Note>((item) => {
          const { kind, payload } = item.value;
          if (kind !== "note" || payload.kind !== "note") return [];

          return [
            {
              id: `local-note-${item.id}`,
              title: payload.title,
              content: payload.content,
              excerpt: payload.content.slice(0, 240),
              version: 0,
              updated: item.createdAt,
              attachments: [],
            },
          ];
        });
        const notes = [...data.notes, ...pendingNotes];

        setWorkspace({
          ...data,
          notes,
          counts: { ...data.counts, notes: notes.length },
        });

        setError("");
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        if (error instanceof ApiRequestError && error.status === 401) {
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

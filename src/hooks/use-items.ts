"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@/components/auth/user-provider";
import { ApiRequestError, apiRequest } from "@/lib/api/client";
import { updateAppBadge } from "@/lib/pwa/app-badge";

export function useItems<T extends { userId: string }>(
  kind: "tasks" | "notes",
  changedEvent: string,
  merge?: (data: T) => Promise<T>,
) {
  const user = useUser();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((value) => value + 1), []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: revision is the explicit refetch trigger for API writes and retries.
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const query = new URLSearchParams({ userId: user.id, timeZone });
        let result = await apiRequest<T>(`/api/${kind}?${query}`, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (result.userId !== user.id)
          throw new Error("Your account changed. Reload to continue.");
        if (merge) result = await merge(result);
        if (controller.signal.aborted) return;
        setData(result);
        setError("");
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof ApiRequestError && error.status === 401) {
          await updateAppBadge(0);
          window.location.assign("/login");
          return;
        }
        setError(
          error instanceof Error
            ? error.message
            : `Unable to load your ${kind}.`,
        );
      }
    }
    void load();
    return () => controller.abort();
  }, [kind, user.id, revision, merge]);

  useEffect(() => {
    window.addEventListener(changedEvent, retry);
    window.addEventListener("online", retry);
    return () => {
      window.removeEventListener(changedEvent, retry);
      window.removeEventListener("online", retry);
    };
  }, [changedEvent, retry]);

  return { data: data?.userId === user.id ? data : null, error, retry };
}

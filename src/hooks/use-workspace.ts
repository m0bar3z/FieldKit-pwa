"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiRequestError,
  apiRequest,
  WORKSPACE_CHANGED,
} from "@/lib/api/client";
import type { Workspace } from "@/lib/products/types";

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((value) => value + 1), []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision is the explicit refetch trigger for API writes and retries.
  useEffect(() => {
    const controller = new AbortController();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    apiRequest<Workspace>(
      `/api/workspace?timeZone=${encodeURIComponent(timeZone)}`,
      { signal: controller.signal },
    )
      .then((data) => {
        if (controller.signal.aborted) return;
        setWorkspace(data);
        setError("");
      })
      .catch((error: unknown) => {
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
      });
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

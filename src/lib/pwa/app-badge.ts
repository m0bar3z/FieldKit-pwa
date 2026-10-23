import { ApiRequestError, apiRequest } from "@/lib/api/client";
import type { Workspace } from "@/lib/products/types";

export async function updateAppBadge(count: number) {
  if (typeof navigator === "undefined") return;

  try {
    if (count > 0 && "setAppBadge" in navigator) {
      await navigator.setAppBadge(count);
    } else if (count === 0 && "clearAppBadge" in navigator) {
      await navigator.clearAppBadge();
    }
  } catch (error) {
    console.warn("Unable to update the app badge.", error);
  }
}

export async function refreshAppBadge() {
  if (typeof navigator === "undefined" || !("setAppBadge" in navigator)) return;

  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const workspace = await apiRequest<Workspace>(
      `/api/workspace?timeZone=${encodeURIComponent(timeZone)}`,
      { signal: AbortSignal.timeout(15_000) },
    );
    await updateAppBadge(workspace.counts.overdue);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      await updateAppBadge(0);
      return;
    }
    console.warn("Unable to refresh the app badge.", error);
  }
}

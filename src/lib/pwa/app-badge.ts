import { ApiRequestError, apiRequest } from "@/lib/api/client";
import type { User } from "@/lib/auth/types";
import type { TasksData } from "@/lib/products/types";

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

export async function refreshAppBadge(expectedUserId?: string) {
  if (typeof navigator === "undefined" || !("setAppBadge" in navigator)) return;

  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const { user } = await apiRequest<{ user: User }>("/api/auth/session", {
      signal: AbortSignal.timeout(15_000),
    });
    if (expectedUserId && user.id !== expectedUserId) return;
    const query = new URLSearchParams({ userId: user.id, timeZone });
    const tasks = await apiRequest<TasksData>(`/api/tasks?${query}`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (tasks.userId !== user.id) return;
    await updateAppBadge(tasks.counts.overdue);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      await updateAppBadge(0);
      return;
    }
    console.warn("Unable to refresh the app badge.", error);
  }
}

import type { FormResponse } from "@/lib/forms/types";

export class ApiRequestError extends Error {
  constructor(
    public result: FormResponse,
    public status: number,
  ) {
    super(result.error ?? "Unable to complete this request.");
  }
}
export async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (typeof options.body === "string")
    headers.set("Content-Type", "application/json");
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
  const result = await response.json().catch((error: unknown) => {
    // A connection can fail after headers arrive, while reading the body.
    if (
      error instanceof TypeError ||
      (error instanceof DOMException && error.name === "AbortError")
    )
      throw error;
    throw new Error("The server returned an unexpected response.");
  });
  if (!response.ok) throw new ApiRequestError(result, response.status);
  return result as T;
}
export const TASKS_CHANGED = "fieldkit-tasks-changed";
export const NOTES_CHANGED = "fieldkit-notes-changed";

export function refreshTasks() {
  window.dispatchEvent(new Event(TASKS_CHANGED));
}

export function refreshNotes() {
  window.dispatchEvent(new Event(NOTES_CHANGED));
}

export function refreshItems(kind: "task" | "note") {
  if (kind === "task") refreshTasks();
  else refreshNotes();
}

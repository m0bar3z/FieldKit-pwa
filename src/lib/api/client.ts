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
  const result = await response.json().catch(() => {
    throw new Error("The server returned an unexpected response.");
  });
  if (!response.ok) throw new ApiRequestError(result, response.status);
  return result as T;
}
export const WORKSPACE_CHANGED = "fieldkit-workspace-changed";
export function refreshWorkspace() {
  window.dispatchEvent(new Event(WORKSPACE_CHANGED));
}

import { ApiRequestError } from "@/lib/api/client";

export function retryDelay(attempts: number) {
  return Math.min(60_000, 1000 * 2 ** Math.min(attempts - 1, 6));
}

export function isRetryableSyncError(error: unknown) {
  if (error instanceof ApiRequestError)
    return error.status >= 500 || error.status === 408 || error.status === 429;

  return (
    error instanceof TypeError ||
    (error instanceof DOMException &&
      (error.name === "TimeoutError" || error.name === "AbortError"))
  );
}

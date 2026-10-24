import "server-only";

import { ApiError } from "@/lib/api/errors";
import type { TaskRecord } from "@/lib/memory/types";

type Receipt = { fingerprint: string; item: TaskRecord };
const taskGlobal = globalThis as typeof globalThis & {
  fieldkitTaskReceipts?: Map<string, Receipt>;
};
taskGlobal.fieldkitTaskReceipts ??= new Map();
const receipts = taskGlobal.fieldkitTaskReceipts;

// A lost response must be safe to retry, even after the item changed again.
// Receipts have the same process lifetime as the demo's task records.
export function taskMutation(
  userId: string,
  mutationId: string | undefined,
  input: unknown,
  apply: () => TaskRecord,
): TaskRecord {
  if (!mutationId) return apply();
  const key = `${userId}:${mutationId}`;
  const fingerprint = JSON.stringify(input);
  const previous = receipts.get(key);
  if (previous) {
    if (previous.fingerprint !== fingerprint)
      throw new ApiError("This saved request changed. Please try again.", 409);
    return structuredClone(previous.item);
  }
  const item = apply();
  receipts.set(key, { fingerprint, item: structuredClone(item) });
  return item;
}

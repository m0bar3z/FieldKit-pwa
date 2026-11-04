import "server-only";
import { ApiError } from "@/lib/api/errors";
import type { NoteRecord, TaskRecord } from "@/lib/memory/types";

type Receipt<T> = { fingerprint: string; item: T };
const receiptGlobal = globalThis as typeof globalThis & {
  fieldkitTaskReceipts?: Map<string, Receipt<TaskRecord>>;
  fieldkitProductReceipts?: Map<string, Receipt<TaskRecord | NoteRecord>>;
};
receiptGlobal.fieldkitProductReceipts ??= new Map();
const receipts = receiptGlobal.fieldkitProductReceipts;
export function productMutation<T extends TaskRecord | NoteRecord>(
  kind: "task" | "note",
  userId: string,
  mutationId: string | undefined,
  input: unknown,
  apply: () => T,
): T {
  if (!mutationId) return apply();
  const fingerprint = JSON.stringify(input);
  const key = `${kind}:${userId}:${mutationId}`;
  const previous =
    receipts.get(key) ??
    (kind === "task"
      ? receiptGlobal.fieldkitTaskReceipts?.get(`${userId}:${mutationId}`)
      : undefined);
  if (previous) {
    if (previous.fingerprint !== fingerprint)
      throw new ApiError("This saved request changed. Please try again.", 409);
    // Kind is part of the receipt key, and callers supply the matching record factory.
    return structuredClone(previous.item) as T;
  }
  const item = apply();
  receipts.set(key, { fingerprint, item: structuredClone(item) });
  return item;
}

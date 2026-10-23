import "server-only";

import { ApiError } from "@/lib/api/errors";
import { memory } from "@/lib/memory/store";
import type { AttachmentRecord } from "@/lib/memory/types";
import { getItem } from "@/lib/products/store";

export function addAttachment(
  userId: string,
  kind: "task" | "note",
  parentId: string,
  file: { name: string; mimeType: string; bytes: Uint8Array },
) {
  getItem(userId, kind, parentId);
  const now = Date.now();
  const attachment: AttachmentRecord = {
    id: crypto.randomUUID(),
    userId,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    kind,
    parentId,
    ...file,
  };
  memory.attachments.push(attachment);
  return attachment;
}
export function getAttachment(userId: string, id: string) {
  const item = memory.attachments.find(
    (item) => item.userId === userId && item.id === id && !item.deletedAt,
  );
  if (!item)
    throw new ApiError("This file is unavailable or was removed.", 404);
  getItem(userId, item.kind, item.parentId);
  return item;
}
export function removeAttachment(userId: string, id: string, version: number) {
  const item = getAttachment(userId, id);
  if (item.version !== version)
    throw new ApiError("This file changed. Refresh and try again.", 409);
  item.deletedAt = Date.now();
  item.updatedAt = item.deletedAt;
  item.version += 1;
  item.bytes = new Uint8Array();
}

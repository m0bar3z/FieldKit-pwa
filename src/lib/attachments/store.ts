import "server-only";

import { ApiError } from "@/lib/api/errors";
import { memory } from "@/lib/memory/store";
import type { AttachmentRecord } from "@/lib/memory/types";
import { getItem } from "@/lib/products/store";

export function addAttachment(
  kind: "task" | "note",
  parentId: string,
  file: { name: string; mimeType: string; bytes: Uint8Array },
) {
  getItem(kind, parentId);
  const now = new Date().toISOString();
  const attachment: AttachmentRecord = {
    id: crypto.randomUUID(),
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
export function getAttachment(id: string) {
  const item = memory.attachments.find(
    (item) => item.id === id && !item.deletedAt,
  );
  if (!item)
    throw new ApiError("This file is unavailable or was removed.", 404);
  getItem(item.kind, item.parentId);
  return item;
}
export function removeAttachment(id: string, version: number) {
  const item = getAttachment(id);
  if (item.version !== version)
    throw new ApiError("This file changed. Refresh and try again.", 409);
  item.deletedAt = new Date().toISOString();
  item.updatedAt = item.deletedAt;
  item.version += 1;
  item.bytes = new Uint8Array();
}

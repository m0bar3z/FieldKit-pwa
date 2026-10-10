import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { withUserDatabase } from "./access";
import { attachmentKey } from "./attachment-input";
import { lockAttachmentParent, ProductOperationError } from "./product-store";
import { attachments, notes, tasks } from "./schema";

export async function reserveAttachment(
  kind: "task" | "note",
  parentId: string,
  input: { id: string; fileName: string; mimeType: string; byteSize: bigint },
) {
  await withUserDatabase(async (tx, ownerId) => {
    await lockAttachmentParent(tx, ownerId, kind, parentId);
    await tx.insert(attachments).values({
      ...input,
      ownerId,
      ...(kind === "task" ? { taskId: parentId } : { noteId: parentId }),
    });
  });
}

export async function finishAttachment(
  kind: "task" | "note",
  parentId: string,
  id: string,
  key: string,
) {
  await withUserDatabase(async (tx, ownerId) => {
    await lockAttachmentParent(tx, ownerId, kind, parentId);
    const [row] = await tx
      .update(attachments)
      .set({ storageKey: key })
      .where(
        and(
          eq(attachments.id, id),
          eq(attachments.ownerId, ownerId),
          eq(
            kind === "task" ? attachments.taskId : attachments.noteId,
            parentId,
          ),
          isNull(attachments.deletedAt),
          isNull(attachments.storageKey),
        ),
      )
      .returning({ id: attachments.id });
    if (!row)
      throw new ProductOperationError("This item is no longer available.");
  });
}

// Pending metadata is hidden from pages; failed uploads never become downloadable.
export async function cancelAttachment(id: string) {
  await withUserDatabase(async (tx, ownerId) => {
    await tx
      .update(attachments)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(attachments.id, id),
          eq(attachments.ownerId, ownerId),
          isNull(attachments.storageKey),
          isNull(attachments.deletedAt),
        ),
      );
  });
}

export async function getOwnedAttachment(id: string, authId: string) {
  return withUserDatabase(async (tx, ownerId) => {
    const [row] = await tx
      .select()
      .from(attachments)
      .where(
        and(
          eq(attachments.id, id),
          eq(attachments.ownerId, ownerId),
          isNull(attachments.deletedAt),
        ),
      );
    if (!row?.storageKey)
      throw new ProductOperationError(
        "This file is unavailable or was removed.",
      );
    const kind = row.taskId ? "task" : "note";
    const parentId = row.taskId ?? row.noteId;
    if (
      !parentId ||
      row.storageKey !== attachmentKey(authId, kind, parentId, row.id)
    )
      throw new ProductOperationError("This file is unavailable.");
    const parent = kind === "task" ? tasks : notes;
    const [active] = await tx
      .select({ id: parent.id })
      .from(parent)
      .where(
        and(
          eq(parent.id, parentId),
          eq(parent.ownerId, ownerId),
          isNull(parent.deletedAt),
        ),
      );
    if (!active)
      throw new ProductOperationError(
        "This file's item is no longer available.",
      );
    return row;
  });
}

export async function markAttachmentRemoved(id: string, key: string) {
  await withUserDatabase(async (tx, ownerId) => {
    await tx
      .update(attachments)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(attachments.id, id),
          eq(attachments.ownerId, ownerId),
          eq(attachments.storageKey, key),
          isNull(attachments.deletedAt),
        ),
      );
  });
}

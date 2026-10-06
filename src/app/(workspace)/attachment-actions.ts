"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  ATTACHMENT_BUCKET,
  AttachmentInputError,
  attachmentKey,
  validateAttachmentBytes,
  validateAttachmentFile,
} from "@/lib/attachment-input";
import {
  cancelAttachment,
  finishAttachment,
  getOwnedAttachment,
  markAttachmentRemoved,
  reserveAttachment,
} from "@/lib/attachment-store";
import { requireUser } from "@/lib/auth";
import {
  type ProductActionState,
  ProductInputError,
  readProductId,
  readVersion,
} from "@/lib/product-input";
import { ProductOperationError } from "@/lib/product-store";
import { createAuthClient } from "@/lib/supabase/server";

function failure(error: unknown): ProductActionState {
  return {
    error:
      error instanceof AttachmentInputError ||
      error instanceof ProductInputError ||
      error instanceof ProductOperationError
        ? error.message
        : "Unable to complete the file operation. Please try again.",
  };
}

export async function uploadAttachment(
  _previous: ProductActionState,
  form: FormData,
): Promise<ProductActionState> {
  const user = await requireUser();
  try {
    const kind = form.get("kind");
    if (kind !== "task" && kind !== "note")
      throw new AttachmentInputError("Choose a task or note for this file.");
    const parentId = readProductId(form, "parentId");
    const file = form.get("file");
    if (!(file instanceof File))
      throw new AttachmentInputError("Choose a file to upload.");
    const mimeType = validateAttachmentFile(file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    validateAttachmentBytes(bytes, mimeType);
    const id = randomUUID();
    const key = attachmentKey(user.id, kind, parentId, id);
    const client = await createAuthClient();
    const storage = client.storage.from(ATTACHMENT_BUCKET);
    await reserveAttachment(kind, parentId, {
      id,
      fileName: file.name,
      mimeType,
      byteSize: BigInt(bytes.length),
    });
    try {
      // Network calls stay outside database transactions; this session's JWT
      // must pass Storage RLS. No service-role key and no object overwrites.
      const { error } = await storage.upload(key, bytes, {
        contentType: mimeType,
        upsert: false,
      });
      if (error)
        throw new ProductOperationError("Upload failed. Please try again.");
      await finishAttachment(kind, parentId, id, key);
    } catch (error) {
      try {
        const { error: cleanupError } = await storage.remove([key]);
        if (cleanupError) console.warn("Attachment storage cleanup failed", id);
      } catch {
        console.warn("Attachment storage cleanup failed", id);
      }
      try {
        await cancelAttachment(id);
      } catch {
        console.warn("Pending attachment cleanup failed", id);
      }
      throw error;
    }
    revalidatePath("/", "layout");
    return { success: "File uploaded." };
  } catch (error) {
    return failure(error);
  }
}

export async function removeAttachment(
  _previous: ProductActionState,
  form: FormData,
): Promise<ProductActionState> {
  const user = await requireUser();
  try {
    const id = readProductId(form);
    const version = readVersion(form);
    const attachment = await getOwnedAttachment(id, user.id);
    if (attachment.version !== version)
      throw new ProductOperationError(
        "This file changed. Refresh the page before trying again.",
      );
    if (!attachment.storageKey)
      throw new ProductOperationError("This file is unavailable.");
    const client = await createAuthClient();
    const { error } = await client.storage
      .from(ATTACHMENT_BUCKET)
      .remove([attachment.storageKey]);
    if (error)
      throw new ProductOperationError(
        "The file could not be removed. Please try again.",
      );
    // Storage deletion is idempotent. If the metadata write fails, retrying can
    // finish it without uploading/deleting another file or restoring a tombstone.
    await markAttachmentRemoved(id, attachment.storageKey);
    revalidatePath("/", "layout");
    return { success: "File removed." };
  } catch (error) {
    return failure(error);
  }
}

import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import type { withUserDatabase } from "./access";
import type { NoteInput, ProductKind, TaskInput } from "./product-input";
import { attachments, notes, reminders, tasks } from "./schema";

type Transaction = Parameters<Parameters<typeof withUserDatabase>[0]>[0];

export class ProductOperationError extends Error {}

const unavailable =
  "This item is unavailable or was deleted. Refresh the page.";
const changed =
  "This item changed since you opened it. Refresh the page before trying again.";

export async function createItem(
  tx: Transaction,
  ownerId: number,
  input: TaskInput | NoteInput,
) {
  const table = "content" in input ? notes : tasks;
  const [row] = await tx
    .insert(table)
    .values({ ...input, ownerId })
    .returning({ id: table.id });
  if (!row) throw new ProductOperationError("Unable to create the item.");
  return row.id;
}

async function lockItem(
  tx: Transaction,
  ownerId: number,
  kind: "task" | "note",
  id: string,
  version: number,
) {
  const table = kind === "task" ? tasks : notes;
  const [row] = await tx
    .select({
      id: table.id,
      version: table.version,
    })
    .from(table)
    .where(
      and(
        eq(table.id, id),
        eq(table.ownerId, ownerId),
        isNull(table.deletedAt),
      ),
    )
    .for("update");
  if (!row) throw new ProductOperationError(unavailable);
  if (row.version !== version) throw new ProductOperationError(changed);
  return row;
}

export async function updateItem(
  tx: Transaction,
  ownerId: number,
  id: string,
  version: number,
  input: TaskInput | NoteInput,
) {
  const kind = "content" in input ? "note" : "task";
  await lockItem(tx, ownerId, kind, id, version);
  const table = kind === "note" ? notes : tasks;
  await tx
    .update(table)
    .set(input)
    .where(and(eq(table.id, id), eq(table.ownerId, ownerId)));
  return id;
}

export async function lockAttachmentParent(
  tx: Transaction,
  ownerId: number,
  kind: "task" | "note",
  id: string,
) {
  const table = kind === "task" ? tasks : notes;
  const [row] = await tx
    .select({ version: table.version })
    .from(table)
    .where(
      and(
        eq(table.id, id),
        eq(table.ownerId, ownerId),
        isNull(table.deletedAt),
      ),
    );
  if (!row) throw new ProductOperationError(unavailable);
  return lockItem(tx, ownerId, kind, id, row.version);
}

export async function setTaskCompleted(
  tx: Transaction,
  ownerId: number,
  id: string,
  version: number,
  completed: boolean,
) {
  await lockItem(tx, ownerId, "task", id, version);
  await tx
    .update(tasks)
    .set({ completed })
    .where(and(eq(tasks.id, id), eq(tasks.ownerId, ownerId)));
}

export async function deleteProduct(
  tx: Transaction,
  ownerId: number,
  kind: ProductKind,
  id: string,
  version: number,
) {
  const deletedAt = new Date();
  await lockItem(tx, ownerId, kind, id, version);
  // Retain tombstones and storage keys. File cleanup/synchronization are later features.
  await tx
    .update(attachments)
    .set({ deletedAt })
    .where(
      and(
        eq(attachments.ownerId, ownerId),
        isNull(attachments.deletedAt),
        eq(kind === "task" ? attachments.taskId : attachments.noteId, id),
      ),
    );
  if (kind === "task")
    await tx
      .update(reminders)
      .set({ deletedAt })
      .where(
        and(
          eq(reminders.ownerId, ownerId),
          isNull(reminders.deletedAt),
          eq(reminders.taskId, id),
        ),
      );
  const table = kind === "task" ? tasks : notes;
  await tx
    .update(table)
    .set({ deletedAt })
    .where(
      and(
        eq(table.ownerId, ownerId),
        isNull(table.deletedAt),
        eq(table.id, id),
      ),
    );
}

import "server-only";

import type { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { memory } from "@/lib/memory/store";
import type { ItemMetadata, NoteRecord, TaskRecord } from "@/lib/memory/types";
import type { noteSchema, taskStateSchema } from "./schemas";

function metadata(userId: string): ItemMetadata {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    userId,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}
function active<T extends ItemMetadata>(
  items: T[],
  userId: string,
  id: string,
): T {
  const item = items.find(
    (item) => item.userId === userId && item.id === id && !item.deletedAt,
  );
  if (!item)
    throw new ApiError("This item is unavailable or was removed.", 404);
  return item;
}
function checkVersion(item: ItemMetadata, version: number) {
  if (item.version !== version)
    throw new ApiError("This item changed. Refresh and try again.", 409);
}
function touch(item: ItemMetadata) {
  item.updatedAt = Date.now();
  item.version += 1;
}
export function getTask(userId: string, id: string) {
  return active(memory.tasks, userId, id);
}
export function getNote(userId: string, id: string) {
  return active(memory.notes, userId, id);
}
export function getItem(userId: string, kind: "task" | "note", id: string) {
  return kind === "task" ? getTask(userId, id) : getNote(userId, id);
}
export function createTask(
  userId: string,
  input: z.infer<typeof taskStateSchema>,
) {
  const item: TaskRecord = {
    ...metadata(userId),
    ...input,
    completed: input.completed ?? false,
  };
  memory.tasks.push(item);
  return item;
}
export function createNote(userId: string, input: z.infer<typeof noteSchema>) {
  const item: NoteRecord = { ...metadata(userId), ...input };
  memory.notes.push(item);
  return item;
}
export function updateTask(
  userId: string,
  id: string,
  version: number,
  input: z.infer<typeof taskStateSchema>,
) {
  const item = getTask(userId, id);
  checkVersion(item, version);
  Object.assign(item, input);
  touch(item);
  return item;
}
export function updateNote(
  userId: string,
  id: string,
  version: number,
  input: z.infer<typeof noteSchema>,
) {
  const item = getNote(userId, id);
  checkVersion(item, version);
  Object.assign(item, input);
  touch(item);
  return item;
}
export function setTaskCompleted(
  userId: string,
  id: string,
  version: number,
  completed: boolean,
) {
  const item = getTask(userId, id);
  checkVersion(item, version);
  item.completed = completed;
  touch(item);
  return item;
}
export function deleteItem(
  userId: string,
  kind: "task" | "note",
  id: string,
  version: number,
) {
  const item = getItem(userId, kind, id);
  checkVersion(item, version);
  item.deletedAt = Date.now();
  touch(item);
  // Keep deletion metadata for future sync, but release the attachment bytes now.
  for (const attachment of memory.attachments) {
    if (
      attachment.kind !== kind ||
      attachment.userId !== userId ||
      attachment.parentId !== id ||
      attachment.deletedAt
    )
      continue;
    attachment.deletedAt = item.deletedAt;
    attachment.bytes = new Uint8Array();
    touch(attachment);
  }
}

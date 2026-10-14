import "server-only";

import type { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { memory } from "@/lib/memory/store";
import type { ItemMetadata, NoteRecord, TaskRecord } from "@/lib/memory/types";
import type { noteSchema, taskSchema } from "./schemas";

function metadata(): ItemMetadata {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}
function active<T extends ItemMetadata>(items: T[], id: string): T {
  const item = items.find((item) => item.id === id && !item.deletedAt);
  if (!item)
    throw new ApiError("This item is unavailable or was removed.", 404);
  return item;
}
function checkVersion(item: ItemMetadata, version: number) {
  if (item.version !== version)
    throw new ApiError("This item changed. Refresh and try again.", 409);
}
function touch(item: ItemMetadata) {
  item.updatedAt = new Date().toISOString();
  item.version += 1;
}
export function getTask(id: string) {
  return active(memory.tasks, id);
}
export function getNote(id: string) {
  return active(memory.notes, id);
}
export function getItem(kind: "task" | "note", id: string) {
  return kind === "task" ? getTask(id) : getNote(id);
}
export function createTask(input: z.infer<typeof taskSchema>) {
  const item: TaskRecord = { ...metadata(), ...input, completed: false };
  memory.tasks.push(item);
  return item;
}
export function createNote(input: z.infer<typeof noteSchema>) {
  const item: NoteRecord = { ...metadata(), ...input };
  memory.notes.push(item);
  return item;
}
export function updateTask(
  id: string,
  version: number,
  input: z.infer<typeof taskSchema>,
) {
  const item = getTask(id);
  checkVersion(item, version);
  Object.assign(item, input);
  touch(item);
  return item;
}
export function updateNote(
  id: string,
  version: number,
  input: z.infer<typeof noteSchema>,
) {
  const item = getNote(id);
  checkVersion(item, version);
  Object.assign(item, input);
  touch(item);
  return item;
}
export function setTaskCompleted(
  id: string,
  version: number,
  completed: boolean,
) {
  const item = getTask(id);
  checkVersion(item, version);
  item.completed = completed;
  touch(item);
  return item;
}
export function deleteItem(kind: "task" | "note", id: string, version: number) {
  const item = getItem(kind, id);
  checkVersion(item, version);
  item.deletedAt = new Date().toISOString();
  touch(item);
  // Keep deletion metadata for future sync, but release the attachment bytes now.
  for (const attachment of memory.attachments) {
    if (
      attachment.kind !== kind ||
      attachment.parentId !== id ||
      attachment.deletedAt
    )
      continue;
    attachment.deletedAt = item.deletedAt;
    attachment.bytes = new Uint8Array();
    touch(attachment);
  }
}

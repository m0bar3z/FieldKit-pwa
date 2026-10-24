import "server-only";

import { memory } from "@/lib/memory/store";
import { calendarDateAt, normalizeTimeZone, taskGroup } from "./presentation";
import type { Attachment, NotesData, TasksData } from "./types";

const sorted = <T extends { updatedAt: number; id: string }>(items: T[]) =>
  [...items].sort(
    (a, b) => b.updatedAt - a.updatedAt || b.id.localeCompare(a.id),
  );

function attachments(
  userId: string,
  kind: "task" | "note",
  parentId: string,
): Attachment[] {
  return memory.attachments
    .filter(
      (item) =>
        item.userId === userId &&
        item.kind === kind &&
        item.parentId === parentId &&
        !item.deletedAt,
    )
    .map((item) => {
      const size = item.bytes.byteLength;
      return {
        id: item.id,
        version: item.version,
        name: item.name,
        kind: item.mimeType.startsWith("image/") ? "image" : "file",
        size:
          size < 1024
            ? `${size} B`
            : size < 1048576
              ? `${(size / 1024).toFixed(1)} KB`
              : `${(size / 1048576).toFixed(1)} MB`,
      };
    });
}

export function getTasks(userId: string, zone?: string): TasksData {
  const timeZone = normalizeTimeZone(zone);
  const today = calendarDateAt(new Date(), timeZone);
  const items = sorted(
    memory.tasks.filter((item) => item.userId === userId && !item.deletedAt),
  ).map((item) => ({
    id: item.id,
    userId,
    version: item.version,
    title: item.title,
    description: item.description,
    completed: item.completed,
    dueDate: item.dueDate,
    group: taskGroup(item, today),
    reminderAt: null,
    attachments: attachments(userId, "task", item.id),
  }));
  return {
    userId,
    items,
    today,
    timeZone,
    counts: {
      dueToday: items.filter((item) => item.group === "today").length,
      overdue: items.filter((item) => item.group === "overdue").length,
      completedTasks: items.filter((item) => item.completed).length,
      openTasks: items.filter((item) => !item.completed).length,
    },
  };
}

export function getNotes(userId: string, zone?: string): NotesData {
  return {
    userId,
    timeZone: normalizeTimeZone(zone),
    items: sorted(
      memory.notes.filter((item) => item.userId === userId && !item.deletedAt),
    ).map((item) => ({
      id: item.id,
      userId,
      version: item.version,
      title: item.title,
      content: item.content,
      excerpt: item.content.slice(0, 240),
      updated: item.updatedAt,
      attachments: attachments(userId, "note", item.id),
    })),
  };
}

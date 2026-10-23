import "server-only";

import { memory } from "@/lib/memory/store";
import { calendarDateAt, normalizeTimeZone, taskGroup } from "./presentation";
import type { Attachment, Note, Task, Workspace } from "./types";

export function getWorkspace(userId: string, zone?: string): Workspace {
  const timeZone = normalizeTimeZone(zone);
  const today = calendarDateAt(new Date(), timeZone);
  const sorted = <T extends { updatedAt: number; id: string }>(items: T[]) =>
    [...items].sort(
      (a, b) => b.updatedAt - a.updatedAt || b.id.localeCompare(a.id),
    );
  function attachments(kind: "task" | "note", parentId: string): Attachment[] {
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
  const tasks: Task[] = sorted(
    memory.tasks.filter((item) => item.userId === userId && !item.deletedAt),
  ).map((item) => ({
    id: item.id,
    version: item.version,
    title: item.title,
    description: item.description,
    completed: item.completed,
    dueDate: item.dueDate,
    group: taskGroup(item, today),
    reminderAt: null,
    attachments: attachments("task", item.id),
  }));
  const notes: Note[] = sorted(
    memory.notes.filter((item) => item.userId === userId && !item.deletedAt),
  ).map((item) => ({
    id: item.id,
    version: item.version,
    title: item.title,
    content: item.content,
    excerpt: item.content.slice(0, 240),
    updated: item.updatedAt,
    attachments: attachments("note", item.id),
  }));
  return {
    tasks,
    notes,
    today,
    timeZone,
    counts: {
      dueToday: tasks.filter((task) => task.group === "today").length,
      overdue: tasks.filter((task) => task.group === "overdue").length,
      completedTasks: tasks.filter((task) => task.completed).length,
      openTasks: tasks.filter((task) => !task.completed).length,
      notes: notes.length,
    },
  };
}

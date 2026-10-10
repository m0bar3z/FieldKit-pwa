import "server-only";

import { and, asc, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { withUserDatabase } from "./access";
import {
  calendarDateAt,
  formatDueDate,
  formatReminder,
  normalizeTimeZone,
  TIME_ZONE_COOKIE,
  taskGroup,
} from "./product-presentation";
import type { Attachment, Note, Task } from "./product-types";
import { attachments, notes, reminders, tasks } from "./schema";

// Per-render deduplication only: never put owned workspace data in a shared cache.
export const getWorkspace = cache(async () => {
  const timeZone = normalizeTimeZone(
    (await cookies()).get(TIME_ZONE_COOKIE)?.value,
  );
  return withUserDatabase(async (tx, ownerId) => {
    const taskRows = await tx
      .select()
      .from(tasks)
      .where(and(eq(tasks.ownerId, ownerId), isNull(tasks.deletedAt)))
      .orderBy(desc(tasks.updatedAt), desc(tasks.id));
    const noteRows = await tx
      .select()
      .from(notes)
      .where(and(eq(notes.ownerId, ownerId), isNull(notes.deletedAt)))
      .orderBy(desc(notes.updatedAt), desc(notes.id));
    const attachmentRows = await tx
      .select({
        id: attachments.id,
        version: attachments.version,
        taskId: attachments.taskId,
        noteId: attachments.noteId,
        name: attachments.fileName,
        mimeType: attachments.mimeType,
        bytes: attachments.byteSize,
      })
      .from(attachments)
      .where(
        and(
          eq(attachments.ownerId, ownerId),
          isNull(attachments.deletedAt),
          isNotNull(attachments.storageKey),
        ),
      )
      .orderBy(asc(attachments.createdAt), asc(attachments.id));
    const reminderRows = await tx
      .select({ taskId: reminders.taskId, at: reminders.remindAt })
      .from(reminders)
      .where(
        and(
          eq(reminders.ownerId, ownerId),
          isNull(reminders.deletedAt),
          isNull(reminders.sentAt),
        ),
      )
      .orderBy(asc(reminders.remindAt), asc(reminders.id));
    const today = calendarDateAt(new Date(), timeZone);
    const updated = (date: Date) =>
      `Updated ${formatDueDate(calendarDateAt(date, timeZone))}`;
    const nextReminder = new Map<string, Date>();
    for (const reminder of reminderRows)
      if (!nextReminder.has(reminder.taskId))
        nextReminder.set(reminder.taskId, reminder.at);
    const taskAttachments = new Map<string, Attachment[]>(),
      noteAttachments = new Map<string, Attachment[]>();
    for (const row of attachmentRows) {
      const bytes = Number(row.bytes);
      const attachment: Attachment = {
        id: row.id,
        version: row.version,
        name: row.name,
        kind: row.mimeType.startsWith("image/") ? "image" : "file",
        size:
          bytes < 1024
            ? `${bytes} B`
            : bytes < 1048576
              ? `${(bytes / 1024).toFixed(1)} KB`
              : `${(bytes / 1048576).toFixed(1)} MB`,
      };
      const parent = row.taskId ?? row.noteId;
      if (!parent) continue;
      const collection = row.taskId ? taskAttachments : noteAttachments;
      const items = collection.get(parent) ?? [];
      items.push(attachment);
      collection.set(parent, items);
    }
    const visibleTasks: Task[] = taskRows.map((row) => {
      const reminder = nextReminder.get(row.id);
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        version: row.version,
        completed: row.completed,
        dueDate: row.dueDate ?? "",
        dueLabel: formatDueDate(row.dueDate ?? ""),
        group: taskGroup(
          { completed: row.completed, dueDate: row.dueDate ?? "" },
          today,
        ),
        reminderAt: reminder?.toISOString() ?? null,
        reminderLabel: reminder
          ? formatReminder(reminder, timeZone)
          : "No reminder set",
        attachments: taskAttachments.get(row.id) ?? [],
      };
    });
    const visibleNotes: Note[] = noteRows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      excerpt: row.content.slice(0, 240),
      version: row.version,
      updated: updated(row.updatedAt),
      attachments: noteAttachments.get(row.id) ?? [],
    }));
    return {
      tasks: visibleTasks,
      notes: visibleNotes,
      today,
      timeZone,
      counts: {
        dueToday: visibleTasks.filter((task) => task.group === "today").length,
        overdue: visibleTasks.filter((task) => task.group === "overdue").length,
        completedTasks: visibleTasks.filter((task) => task.completed).length,
        openTasks: visibleTasks.filter((task) => !task.completed).length,
        notes: visibleNotes.length,
      },
    };
  });
});

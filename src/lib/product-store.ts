import "server-only";

import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import type { withUserDatabase } from "./access";
import type {
  NoteInput,
  ProductKind,
  ProjectInput,
  TaskInput,
} from "./product-input";
import { attachments, notes, projects, reminders, tasks } from "./schema";

type Transaction = Parameters<Parameters<typeof withUserDatabase>[0]>[0];

export class ProductOperationError extends Error {}

const unavailable =
  "This item is unavailable or was deleted. Refresh the page.";
const changed =
  "This item changed since you opened it. Refresh the page before trying again.";

// All writes lock their parent project first. This serializes creation/moves with
// project deletion, so a concurrent save cannot leave an active item in a deleted project.
async function lockProjects(tx: Transaction, ownerId: number, ids: string[]) {
  const uniqueIds = [...new Set(ids)].sort();
  const rows = await tx
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.ownerId, ownerId),
        inArray(projects.id, uniqueIds),
        isNull(projects.deletedAt),
      ),
    )
    .orderBy(asc(projects.id))
    .for("update");
  if (rows.length !== uniqueIds.length)
    throw new ProductOperationError(
      "The selected project is unavailable. Choose an active project.",
    );
  return rows;
}

export async function createProject(
  tx: Transaction,
  ownerId: number,
  input: ProjectInput,
) {
  const [row] = await tx
    .insert(projects)
    .values({ ...input, ownerId })
    .returning({ id: projects.id });
  if (!row) throw new ProductOperationError("Unable to create the project.");
  return row.id;
}

export async function updateProject(
  tx: Transaction,
  ownerId: number,
  id: string,
  version: number,
  input: ProjectInput,
) {
  await lockProjects(tx, ownerId, [id]);
  const [row] = await tx
    .update(projects)
    .set(input)
    .where(
      and(
        eq(projects.id, id),
        eq(projects.ownerId, ownerId),
        eq(projects.version, version),
        isNull(projects.deletedAt),
      ),
    )
    .returning({ id: projects.id });
  if (!row) throw new ProductOperationError(changed);
  return row.id;
}

export async function createItem(
  tx: Transaction,
  ownerId: number,
  input: TaskInput | NoteInput,
) {
  await lockProjects(tx, ownerId, [input.projectId]);
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
  destination?: string,
) {
  const table = kind === "task" ? tasks : notes;
  const [original] = await tx
    .select({ projectId: table.projectId })
    .from(table)
    .where(
      and(
        eq(table.id, id),
        eq(table.ownerId, ownerId),
        isNull(table.deletedAt),
      ),
    );
  if (!original) throw new ProductOperationError(unavailable);
  await lockProjects(tx, ownerId, [
    original.projectId,
    ...(destination ? [destination] : []),
  ]);
  const [row] = await tx
    .select({
      id: table.id,
      projectId: table.projectId,
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
  if (row.version !== version || row.projectId !== original.projectId)
    throw new ProductOperationError(changed);
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
  await lockItem(tx, ownerId, kind, id, version, input.projectId);
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
  let taskIds: string[] = [];
  let noteIds: string[] = [];
  let projectId: string;
  if (kind === "project") {
    const [project] = await lockProjects(tx, ownerId, [id]);
    if (project?.version !== version) throw new ProductOperationError(changed);
    projectId = id;
    taskIds = (
      await tx
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.ownerId, ownerId), eq(tasks.projectId, id)))
    ).map((row) => row.id);
    noteIds = (
      await tx
        .select({ id: notes.id })
        .from(notes)
        .where(and(eq(notes.ownerId, ownerId), eq(notes.projectId, id)))
    ).map((row) => row.id);
  } else {
    projectId = (await lockItem(tx, ownerId, kind, id, version)).projectId;
    if (kind === "task") taskIds = [id];
    else noteIds = [id];
  }
  const attachmentParents = [
    ...(taskIds.length ? [inArray(attachments.taskId, taskIds)] : []),
    ...(noteIds.length ? [inArray(attachments.noteId, noteIds)] : []),
  ];
  // Retain tombstones and storage keys. File cleanup/synchronization are later features.
  if (attachmentParents.length)
    await tx
      .update(attachments)
      .set({ deletedAt })
      .where(
        and(
          eq(attachments.ownerId, ownerId),
          isNull(attachments.deletedAt),
          or(...attachmentParents),
        ),
      );
  if (taskIds.length) {
    await tx
      .update(reminders)
      .set({ deletedAt })
      .where(
        and(
          eq(reminders.ownerId, ownerId),
          isNull(reminders.deletedAt),
          inArray(reminders.taskId, taskIds),
        ),
      );
    await tx
      .update(tasks)
      .set({ deletedAt })
      .where(
        and(
          eq(tasks.ownerId, ownerId),
          isNull(tasks.deletedAt),
          inArray(tasks.id, taskIds),
        ),
      );
  }
  if (noteIds.length)
    await tx
      .update(notes)
      .set({ deletedAt })
      .where(
        and(
          eq(notes.ownerId, ownerId),
          isNull(notes.deletedAt),
          inArray(notes.id, noteIds),
        ),
      );
  if (kind === "project")
    await tx
      .update(projects)
      .set({ deletedAt })
      .where(and(eq(projects.ownerId, ownerId), eq(projects.id, id)));
  return projectId;
}

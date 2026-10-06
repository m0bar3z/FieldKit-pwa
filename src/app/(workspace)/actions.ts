"use server";

import { revalidatePath } from "next/cache";
import { withUserDatabase } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import {
  type ProductActionState,
  ProductInputError,
  readCompleted,
  readNote,
  readProductId,
  readProject,
  readTask,
  readVersion,
} from "@/lib/product-input";
import * as store from "@/lib/product-store";

async function run(
  operation: () => Promise<string | undefined>,
  success: string,
): Promise<ProductActionState> {
  await requireUser();
  let destination: string | undefined;
  try {
    destination = await operation();
  } catch (error) {
    if (error instanceof ProductInputError)
      return { error: error.message, fields: error.fields };
    if (error instanceof store.ProductOperationError)
      return { error: error.message };
    // Return a useful failure without exposing SQL, connection details, or user data.
    return { error: "Unable to save changes. Please try again." };
  }
  revalidatePath("/", "layout");
  // Let the form announce success before navigating. Destinations are constructed
  // here from validated IDs, never supplied as URLs.
  return { success, ...(destination ? { destination } : {}) };
}

export async function createProject(
  _state: ProductActionState,
  form: FormData,
) {
  return run(async () => {
    const input = readProject(form);
    const id = await withUserDatabase((tx, ownerId) =>
      store.createProject(tx, ownerId, input),
    );
    return `/projects/${id}`;
  }, "Project created.");
}

export async function updateProject(
  _state: ProductActionState,
  form: FormData,
) {
  return run(async () => {
    const id = readProductId(form),
      version = readVersion(form),
      input = readProject(form);
    await withUserDatabase((tx, ownerId) =>
      store.updateProject(tx, ownerId, id, version, input),
    );
    return `/projects/${id}`;
  }, "Project saved.");
}

async function saveItem(
  form: FormData,
  kind: "task" | "note",
  editing: boolean,
) {
  const input = kind === "task" ? readTask(form) : readNote(form);
  const id = editing ? readProductId(form) : undefined;
  const version = editing ? readVersion(form) : undefined;
  const saved = await withUserDatabase((tx, ownerId) =>
    id && version
      ? store.updateItem(tx, ownerId, id, version, input)
      : store.createItem(tx, ownerId, input),
  );
  return `/${kind === "task" ? "tasks" : "notes"}/${saved}`;
}

export async function createTask(_state: ProductActionState, form: FormData) {
  return run(() => saveItem(form, "task", false), "Task created.");
}
export async function updateTask(_state: ProductActionState, form: FormData) {
  return run(() => saveItem(form, "task", true), "Task saved.");
}
export async function createNote(_state: ProductActionState, form: FormData) {
  return run(() => saveItem(form, "note", false), "Note created.");
}
export async function updateNote(_state: ProductActionState, form: FormData) {
  return run(() => saveItem(form, "note", true), "Note saved.");
}

export async function deleteItem(_state: ProductActionState, form: FormData) {
  return run(async () => {
    const kind = form.get("kind");
    if (kind !== "project" && kind !== "task" && kind !== "note")
      throw new ProductInputError({ kind: "Choose a valid item." });
    const id = readProductId(form),
      version = readVersion(form);
    const parentId = await withUserDatabase((tx, ownerId) =>
      store.deleteProduct(tx, ownerId, kind, id, version),
    );
    return kind === "project" ? "/projects" : `/projects/${parentId}`;
  }, "Item deleted.");
}

export async function toggleTaskCompletion(
  _state: ProductActionState,
  form: FormData,
) {
  return run(async () => {
    const id = readProductId(form),
      version = readVersion(form),
      completed = readCompleted(form);
    await withUserDatabase((tx, ownerId) =>
      store.setTaskCompleted(tx, ownerId, id, version, completed),
    );
    return undefined;
  }, "Task completion updated.");
}

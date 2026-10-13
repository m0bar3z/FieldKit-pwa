import type { z } from "zod";
import { validationFields } from "@/lib/forms/validation";
import {
  completedValueSchema,
  noteSchema,
  productIdSchema,
  taskSchema,
  versionSchema,
} from "./schemas";

export type ProductKind = "task" | "note";
export type ProductActionState = {
  error?: string;
  fields?: Record<string, string>;
  success?: string;
  destination?: string;
};
export type TaskInput = Omit<z.infer<typeof taskSchema>, "dueDate"> & {
  dueDate: string | null;
};
export type NoteInput = z.infer<typeof noteSchema>;

export class ProductInputError extends Error {
  constructor(public fields: Record<string, string>) {
    super("Please check the highlighted fields.");
  }
}

export function isProductId(value: unknown): value is string {
  return productIdSchema.safeParse(value).success;
}

export function readProductId(form: FormData, key = "id") {
  const result = productIdSchema.safeParse(form.get(key));
  if (!result.success)
    throw new ProductInputError({
      [key]: result.error.issues[0]?.message ?? "Choose a valid item.",
    });
  return result.data;
}

export function readVersion(form: FormData) {
  const result = versionSchema.safeParse(form.get("version"));
  if (!result.success)
    throw new ProductInputError({ version: "Refresh the page and try again." });
  return Number(result.data);
}

export function readTask(form: FormData): TaskInput {
  const result = taskSchema.safeParse({
    title: form.get("title") ?? "",
    description: form.get("description") ?? "",
    dueDate: form.get("dueDate") ?? "",
  });
  if (!result.success)
    throw new ProductInputError(validationFields(result.error));
  return { ...result.data, dueDate: result.data.dueDate || null };
}

export function readNote(form: FormData): NoteInput {
  const result = noteSchema.safeParse({
    title: form.get("title") ?? "",
    content: form.get("content") ?? "",
  });
  if (!result.success)
    throw new ProductInputError(validationFields(result.error));
  return result.data;
}

export function readCompleted(form: FormData) {
  const result = completedValueSchema.safeParse(form.get("completed"));
  if (!result.success)
    throw new ProductInputError({
      completed: "Choose a valid completion state.",
    });
  return result.data === "true";
}

import { z } from "zod";
import { isCalendarDate } from "./dates";

function productText(max: number, required = false, trim = true) {
  const text = z.string({ error: "Enter text, not a file." });
  return (trim ? text.trim() : text)
    .refine((value) => !required || value.length > 0, "This field is required.")
    .refine(
      (value) => value.length <= max && !value.includes("\0"),
      `Use at most ${max} characters without null characters.`,
    );
}

export const productKindSchema = z.enum(["task", "note"], {
  error: "Choose a valid item.",
});
export const productIdSchema = z
  .string({ error: "Choose a valid item." })
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "Choose a valid item.",
  );
export const versionSchema = z
  .string({ error: "Refresh the page and try again." })
  .regex(/^[1-9]\d{0,9}$/, "Refresh the page and try again.")
  .refine(
    (value) => Number(value) <= 2147483647,
    "Refresh the page and try again.",
  );
export const identitySchema = z.object({
  id: productIdSchema,
  version: versionSchema,
});
export const taskSchema = z.object({
  title: productText(200, true),
  description: productText(10000),
  dueDate: productText(10).refine(
    isCalendarDate,
    "Choose a valid calendar date.",
  ),
});
export const noteSchema = z.object({
  title: productText(200, true),
  content: productText(100000, false, false),
});

export const taskStateSchema = taskSchema.extend({
  completed: z.boolean().optional(),
});
export const taskCreateSchema = taskStateSchema.extend({
  mutationId: productIdSchema.optional(),
});
export const taskUpdateSchema = taskCreateSchema.extend({
  version: versionSchema,
});
export const taskDeleteSchema = identitySchema.omit({ id: true }).extend({
  mutationId: productIdSchema.optional(),
});

// IDs/versions are present for editing; creation gets its identity from the server.
const editorIdentity = identitySchema.partial().shape;
export const itemFormSchema = z.discriminatedUnion("kind", [
  taskSchema.extend({ kind: z.literal("task"), ...editorIdentity }),
  noteSchema.extend({ kind: z.literal("note"), ...editorIdentity }),
]);
export const deleteItemSchema = identitySchema.extend({
  kind: productKindSchema,
});
export const completionSchema = identitySchema.extend({
  completed: z.boolean(),
});
export const taskCompletionSchema = completionSchema.omit({ id: true }).extend({
  mutationId: productIdSchema.optional(),
});
export const completedValueSchema = z.enum(["true", "false"], {
  error: "Choose a valid completion state.",
});
export type ItemFormValues = z.infer<typeof itemFormSchema>;

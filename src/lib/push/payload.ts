import { z } from "zod";
import { productIdSchema } from "@/lib/products/schemas";

export const reminderPayloadSchema = z.object({
  kind: z.literal("task-reminder"),
  userId: z.string().min(1).max(200),
  taskId: productIdSchema,
  reminderAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().positive(),
});
export type ReminderPayload = z.infer<typeof reminderPayloadSchema>;
export const reminderTag = (payload: ReminderPayload) =>
  `fieldkit-task:${payload.taskId}:${payload.reminderAt}`;

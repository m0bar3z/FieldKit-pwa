import type { TaskRecord } from "@/lib/memory/types";
import { productMutation } from "./product-mutations";
export const taskMutation = (
  userId: string,
  mutationId: string | undefined,
  input: unknown,
  apply: () => TaskRecord,
) => productMutation("task", userId, mutationId, input, apply);

import { apiRoute, readJson } from "@/lib/api/server";
import {
  identitySchema,
  productIdSchema,
  taskSchema,
  taskUpdateSchema,
} from "@/lib/products/schemas";
import { deleteItem, getTask, updateTask } from "@/lib/products/store";
import { taskMutation } from "@/lib/products/task-mutations";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  return apiRoute(request, async (user) =>
    getTask(user.id, productIdSchema.parse((await params).id)),
  );
}
export async function PATCH(request: Request, { params }: Context) {
  return apiRoute(request, async (user) => {
    const id = productIdSchema.parse((await params).id);
    const body = await readJson(request);
    const input = taskUpdateSchema.parse(body);
    const item = taskMutation(
      user.id,
      input.mutationId,
      ["update", id, input],
      () =>
        updateTask(user.id, id, Number(input.version), taskSchema.parse(input)),
    );
    return { success: "Task saved.", item };
  });
}
export async function DELETE(request: Request, { params }: Context) {
  return apiRoute(request, async (user) => {
    const id = productIdSchema.parse((await params).id);
    const input = identitySchema
      .omit({ id: true })
      .parse(await readJson(request));
    deleteItem(user.id, "task", id, Number(input.version));
    return { success: "Task deleted.", destination: "/tasks" };
  });
}

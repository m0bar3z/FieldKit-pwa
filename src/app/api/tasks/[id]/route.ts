import { apiRoute, readJson } from "@/lib/api/server";
import {
  productIdSchema,
  taskDeleteSchema,
  taskStateSchema,
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
        updateTask(
          user.id,
          id,
          Number(input.version),
          taskStateSchema.parse(input),
        ),
    );
    return { success: "Task saved.", item };
  });
}
export async function DELETE(request: Request, { params }: Context) {
  return apiRoute(request, async (user) => {
    const id = productIdSchema.parse((await params).id);
    const input = taskDeleteSchema.parse(await readJson(request));
    const item = taskMutation(
      user.id,
      input.mutationId,
      ["delete", id, input],
      () => {
        const task = getTask(user.id, id);
        deleteItem(user.id, "task", id, Number(input.version));
        return task;
      },
    );
    return { success: "Task deleted.", destination: "/tasks", item };
  });
}

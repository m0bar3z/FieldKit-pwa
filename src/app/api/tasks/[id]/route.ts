import { apiRoute, readJson } from "@/lib/api/server";
import {
  identitySchema,
  productIdSchema,
  taskSchema,
  versionSchema,
} from "@/lib/products/schemas";
import { deleteItem, getTask, updateTask } from "@/lib/products/store";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  return apiRoute(request, async () =>
    getTask(productIdSchema.parse((await params).id)),
  );
}
export async function PATCH(request: Request, { params }: Context) {
  return apiRoute(request, async () => {
    const id = productIdSchema.parse((await params).id);
    const body = await readJson(request);
    const input = taskSchema.extend({ version: versionSchema }).parse(body);
    const item = updateTask(id, Number(input.version), taskSchema.parse(input));
    return { success: "Task saved.", item };
  });
}
export async function DELETE(request: Request, { params }: Context) {
  return apiRoute(request, async () => {
    const id = productIdSchema.parse((await params).id);
    const input = identitySchema
      .omit({ id: true })
      .parse(await readJson(request));
    deleteItem("task", id, Number(input.version));
    return { success: "Task deleted.", destination: "/tasks" };
  });
}

import { apiRoute, readJson } from "@/lib/api/server";
import { productIdSchema, taskCompletionSchema } from "@/lib/products/schemas";
import { setTaskCompleted } from "@/lib/products/store";
import { taskMutation } from "@/lib/products/task-mutations";

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Context) {
  return apiRoute(request, async (user) => {
    const id = productIdSchema.parse((await params).id);
    const input = taskCompletionSchema.parse(await readJson(request));
    const item = taskMutation(
      user.id,
      input.mutationId,
      ["complete", id, input],
      () =>
        setTaskCompleted(user.id, id, Number(input.version), input.completed),
    );
    return { success: "Task completion updated.", item };
  });
}

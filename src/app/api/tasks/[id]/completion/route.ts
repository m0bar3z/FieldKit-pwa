import { apiRoute, readJson } from "@/lib/api/server";
import { completionSchema, productIdSchema } from "@/lib/products/schemas";
import { setTaskCompleted } from "@/lib/products/store";

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Context) {
  return apiRoute(request, async () => {
    const id = productIdSchema.parse((await params).id);
    const input = completionSchema
      .omit({ id: true })
      .parse(await readJson(request));
    const item = setTaskCompleted(id, Number(input.version), input.completed);
    return { success: "Task completion updated.", item };
  });
}

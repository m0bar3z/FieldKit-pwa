import { apiRoute, readJson } from "@/lib/api/server";
import { getTasks } from "@/lib/products/queries";
import { taskCreateSchema, taskStateSchema } from "@/lib/products/schemas";
import { createTask } from "@/lib/products/store";
import { taskMutation } from "@/lib/products/task-mutations";

export async function GET(request: Request) {
  return apiRoute(request, (user) =>
    getTasks(
      user.id,
      new URL(request.url).searchParams.get("timeZone") ?? undefined,
    ),
  );
}
export async function POST(request: Request) {
  return apiRoute(request, async (user) => {
    const input = taskCreateSchema.parse(await readJson(request));
    const item = taskMutation(
      user.id,
      input.mutationId,
      ["create", input],
      () => createTask(user.id, taskStateSchema.parse(input)),
    );
    return { success: "Task created.", destination: `/tasks/${item.id}`, item };
  });
}

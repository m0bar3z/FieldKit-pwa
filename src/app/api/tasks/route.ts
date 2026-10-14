import { apiRoute, readJson } from "@/lib/api/server";
import { memory } from "@/lib/memory/store";
import { taskSchema } from "@/lib/products/schemas";
import { createTask } from "@/lib/products/store";

export async function GET(request: Request) {
  return apiRoute(request, () =>
    memory.tasks.filter((item) => !item.deletedAt),
  );
}
export async function POST(request: Request) {
  return apiRoute(request, async () => {
    const item = createTask(taskSchema.parse(await readJson(request)));
    return { success: "Task created.", destination: `/tasks/${item.id}`, item };
  });
}

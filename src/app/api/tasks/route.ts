import { apiRoute, readJson } from "@/lib/api/server";
import { getTasks } from "@/lib/products/queries";
import { taskSchema } from "@/lib/products/schemas";
import { createTask } from "@/lib/products/store";

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
    const item = createTask(user.id, taskSchema.parse(await readJson(request)));
    return { success: "Task created.", destination: `/tasks/${item.id}`, item };
  });
}

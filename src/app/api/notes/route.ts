import { apiRoute, readJson } from "@/lib/api/server";
import { getNotes } from "@/lib/products/queries";
import { noteSchema } from "@/lib/products/schemas";
import { createNote } from "@/lib/products/store";

export async function GET(request: Request) {
  return apiRoute(request, (user) =>
    getNotes(
      user.id,
      new URL(request.url).searchParams.get("timeZone") ?? undefined,
    ),
  );
}
export async function POST(request: Request) {
  return apiRoute(request, async (user) => {
    const item = createNote(user.id, noteSchema.parse(await readJson(request)));
    return { success: "Note created.", destination: `/notes/${item.id}`, item };
  });
}

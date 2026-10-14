import { apiRoute, readJson } from "@/lib/api/server";
import { memory } from "@/lib/memory/store";
import { noteSchema } from "@/lib/products/schemas";
import { createNote } from "@/lib/products/store";

export async function GET(request: Request) {
  return apiRoute(request, () =>
    memory.notes.filter((item) => !item.deletedAt),
  );
}
export async function POST(request: Request) {
  return apiRoute(request, async () => {
    const item = createNote(noteSchema.parse(await readJson(request)));
    return { success: "Note created.", destination: `/notes/${item.id}`, item };
  });
}

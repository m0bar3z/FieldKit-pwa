import { apiRoute, readJson } from "@/lib/api/server";
import { productMutation } from "@/lib/products/product-mutations";
import { getNotes } from "@/lib/products/queries";
import { noteCreateSchema, noteSchema } from "@/lib/products/schemas";
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
    const input = noteCreateSchema.parse(await readJson(request));
    const item = productMutation(
      "note",
      user.id,
      input.mutationId,
      ["create", input],
      () => createNote(user.id, noteSchema.parse(input)),
    );
    return { success: "Note created.", destination: `/notes/${item.id}`, item };
  });
}

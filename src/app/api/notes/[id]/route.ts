import { apiRoute, readJson } from "@/lib/api/server";
import { productMutation } from "@/lib/products/product-mutations";
import {
  noteDeleteSchema,
  noteSchema,
  noteUpdateSchema,
  productIdSchema,
} from "@/lib/products/schemas";
import { deleteItem, getNote, updateNote } from "@/lib/products/store";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  return apiRoute(request, async (user) =>
    getNote(user.id, productIdSchema.parse((await params).id)),
  );
}
export async function PATCH(request: Request, { params }: Context) {
  return apiRoute(request, async (user) => {
    const id = productIdSchema.parse((await params).id);
    const body = await readJson(request);
    const input = noteUpdateSchema.parse(body);
    const item = productMutation(
      "note",
      user.id,
      input.mutationId,
      ["update", id, input],
      () =>
        updateNote(user.id, id, Number(input.version), noteSchema.parse(input)),
    );
    return { success: "Note saved.", item };
  });
}
export async function DELETE(request: Request, { params }: Context) {
  return apiRoute(request, async (user) => {
    const id = productIdSchema.parse((await params).id);
    const input = noteDeleteSchema.parse(await readJson(request));
    const item = productMutation(
      "note",
      user.id,
      input.mutationId,
      ["delete", id, input],
      () => {
        const note = getNote(user.id, id);
        deleteItem(user.id, "note", id, Number(input.version));
        return note;
      },
    );
    return { success: "Note deleted.", destination: "/notes", item };
  });
}

import { z } from "zod";
import { apiRoute, readJson } from "@/lib/api/server";
import {
  identitySchema,
  noteSchema,
  productIdSchema,
  versionSchema,
} from "@/lib/products/schemas";
import { deleteItem, getNote, updateNote } from "@/lib/products/store";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  return apiRoute(request, async () =>
    getNote(productIdSchema.parse((await params).id)),
  );
}
export async function PATCH(request: Request, { params }: Context) {
  return apiRoute(request, async () => {
    const id = productIdSchema.parse((await params).id);
    const body = await readJson(request);
    const input = noteSchema.extend({ version: versionSchema }).parse(body);
    const operationKey = z
      .string()
      .min(1)
      .max(200)
      .optional()
      .parse(request.headers.get("Idempotency-Key") ?? undefined);
    const item = updateNote(
      id,
      Number(input.version),
      noteSchema.parse(input),
      operationKey,
    );
    return { success: "Note saved.", item };
  });
}
export async function DELETE(request: Request, { params }: Context) {
  return apiRoute(request, async () => {
    const id = productIdSchema.parse((await params).id);
    const input = identitySchema
      .omit({ id: true })
      .parse(await readJson(request));
    deleteItem("note", id, Number(input.version));
    return { success: "Note deleted.", destination: "/notes" };
  });
}

import { simulateApiDelay } from "@/lib/api/delay";
import { ApiError } from "@/lib/api/errors";
import {
  apiFailure,
  apiRoute,
  privateHeaders,
  readJson,
} from "@/lib/api/server";
import { getAttachment, removeAttachment } from "@/lib/attachments/store";
import { getCurrentUser } from "@/lib/auth/session";
import { identitySchema, productIdSchema } from "@/lib/products/schemas";

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  try {
    await simulateApiDelay();
    if (!(await getCurrentUser()))
      throw new ApiError("Sign in to download files.", 401);
    const attachment = getAttachment(productIdSchema.parse((await params).id));
    return new Response(new Blob([new Uint8Array(attachment.bytes)]), {
      headers: {
        ...privateHeaders,
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="attachment"; filename*=UTF-8''${encodeURIComponent(attachment.name).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)}`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function DELETE(request: Request, { params }: Context) {
  return apiRoute(request, async () => {
    const id = productIdSchema.parse((await params).id);
    const input = identitySchema
      .omit({ id: true })
      .parse(await readJson(request));
    removeAttachment(id, Number(input.version));
    return { success: "File removed." };
  });
}

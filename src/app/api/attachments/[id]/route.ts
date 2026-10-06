import { unstable_rethrow } from "next/navigation";
import {
  ATTACHMENT_BUCKET,
  MAX_ATTACHMENT_BYTES,
} from "@/lib/attachment-input";
import { getOwnedAttachment } from "@/lib/attachment-store";
import { getCurrentUser } from "@/lib/auth";
import { isProductId } from "@/lib/product-input";
import { ProductOperationError } from "@/lib/product-store";
import { createAuthClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/attachments/[id]">,
) {
  const headers = { "Cache-Control": "private, no-store" };
  const user = await getCurrentUser();
  if (!user)
    return Response.json(
      { error: "Sign in to download files." },
      { status: 401, headers },
    );
  const { id } = await params;
  if (!isProductId(id))
    return Response.json(
      { error: "This file is unavailable." },
      { status: 404, headers },
    );
  try {
    const attachment = await getOwnedAttachment(id, user.id);
    if (
      !attachment.storageKey ||
      attachment.byteSize > BigInt(MAX_ATTACHMENT_BYTES)
    )
      throw new ProductOperationError("This file is unavailable.");
    const client = await createAuthClient();
    const { data, error } = await client.storage
      .from(ATTACHMENT_BUCKET)
      .download(attachment.storageKey);
    if (error || !data)
      return Response.json(
        { error: "Unable to download this file. Please try again." },
        { status: 502, headers },
      );
    return new Response(data, {
      headers: {
        ...headers,
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="attachment"; filename*=UTF-8''${encodeURIComponent(attachment.fileName).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)}`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    unstable_rethrow(error);
    return Response.json(
      {
        error:
          error instanceof ProductOperationError
            ? error.message
            : "Unable to download this file. Please try again.",
      },
      { status: error instanceof ProductOperationError ? 404 : 500, headers },
    );
  }
}

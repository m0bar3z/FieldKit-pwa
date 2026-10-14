import { ApiError } from "@/lib/api/errors";
import { apiRoute } from "@/lib/api/server";
import {
  validateAttachmentBytes,
  validateAttachmentFile,
} from "@/lib/attachments/input";
import { uploadAttachmentSchema } from "@/lib/attachments/schemas";
import { addAttachment } from "@/lib/attachments/store";

export async function POST(request: Request) {
  return apiRoute(request, async () => {
    const form = await request.formData().catch(() => {
      throw new ApiError("Choose a file to upload.");
    });
    const input = uploadAttachmentSchema.parse({
      kind: form.get("kind"),
      parentId: form.get("parentId"),
      file: form.get("file"),
    });
    if (!input.file) throw new ApiError("Choose a file to upload.");
    const mimeType = validateAttachmentFile(input.file);
    const bytes = new Uint8Array(await input.file.arrayBuffer());
    validateAttachmentBytes(bytes, mimeType);
    const item = addAttachment(input.kind, input.parentId, {
      name: input.file.name,
      mimeType,
      bytes,
    });
    return { success: "File uploaded.", id: item.id };
  });
}

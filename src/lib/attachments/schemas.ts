import { z } from "zod";
import { productIdSchema, productKindSchema } from "@/lib/products/schemas";
import { attachmentMime, MAX_ATTACHMENT_BYTES } from "./constants";

export const attachmentMetadataSchema = z
  .object({
    name: z
      .string()
      .refine(
        (name) =>
          name.trim().length > 0 &&
          name.length <= 255 &&
          ![...name].some(
            (character) =>
              character.charCodeAt(0) < 32 ||
              character.charCodeAt(0) === 127 ||
              character === "/" ||
              character === "\\",
          ),
        "Use a filename without paths or control characters, up to 255 characters.",
      ),
    type: z.string(),
    size: z
      .number()
      .positive("Choose a non-empty file.")
      .max(MAX_ATTACHMENT_BYTES, "Files must be 3 MB or smaller."),
  })
  .superRefine((file, context) => {
    const mime = attachmentMime(file.name);
    if (!mime || (file.type && file.type !== mime))
      context.addIssue({
        code: "custom",
        message: "Choose a JPG, PNG, WebP, GIF, PDF, or text file.",
      });
  });

// Do not access the browser-only File constructor when schemas load on the server.
const fileSchema = z
  .custom<File | null>(
    (value) =>
      value === null ||
      (value instanceof Blob &&
        "name" in value &&
        typeof value.name === "string"),
    { error: "Choose a file to upload." },
  )
  .superRefine((file, context) => {
    if (!file) {
      context.addIssue({ code: "custom", message: "Choose a file to upload." });
      return;
    }
    const result = attachmentMetadataSchema.safeParse(file);
    if (!result.success)
      for (const issue of result.error.issues)
        context.addIssue({ code: "custom", message: issue.message });
  });

export const uploadAttachmentSchema = z.object({
  kind: productKindSchema,
  parentId: productIdSchema,
  file: fileSchema,
});

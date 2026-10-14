import { attachmentMime } from "./constants";
import { attachmentMetadataSchema } from "./schemas";

export {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_HELP,
  MAX_ATTACHMENT_BYTES,
} from "./constants";

export class AttachmentInputError extends Error {}

export function validateAttachmentFile(
  file: Pick<File, "name" | "type" | "size">,
) {
  const result = attachmentMetadataSchema.safeParse(file);
  if (!result.success)
    throw new AttachmentInputError(
      result.error.issues[0]?.message ?? "Choose another file.",
    );
  const mime = attachmentMime(result.data.name);
  if (!mime) throw new AttachmentInputError("Choose another file.");
  return mime;
}

export function validateAttachmentBytes(bytes: Uint8Array, mime: string) {
  const starts = (...signature: number[]) =>
    signature.every((value, index) => bytes[index] === value);
  const textAt = (start: number, length: number) =>
    String.fromCharCode(...bytes.slice(start, start + length));
  const valid =
    mime === "image/jpeg"
      ? starts(0xff, 0xd8, 0xff)
      : mime === "image/png"
        ? starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
        : mime === "image/webp"
          ? textAt(0, 4) === "RIFF" && textAt(8, 4) === "WEBP"
          : mime === "image/gif"
            ? ["GIF87a", "GIF89a"].includes(textAt(0, 6))
            : mime === "application/pdf"
              ? textAt(0, 5) === "%PDF-"
              : mime === "text/plain" && !bytes.includes(0);
  if (!valid)
    throw new AttachmentInputError("The file contents do not match its type.");
  if (mime === "text/plain") {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new AttachmentInputError("Text files must use UTF-8 encoding.");
    }
  }
}

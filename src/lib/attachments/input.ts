export const ATTACHMENT_BUCKET = "fieldkit-attachments";
export const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
export const ATTACHMENT_ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,.pdf,.txt";
export const ATTACHMENT_HELP =
  "JPG, PNG, WebP, GIF, PDF, or UTF-8 text. Up to 3 MB per file.";

const formats: Record<string, { mime: string; extensions: string[] }> = {
  "image/jpeg": { mime: "image/jpeg", extensions: ["jpg", "jpeg"] },
  "image/png": { mime: "image/png", extensions: ["png"] },
  "image/webp": { mime: "image/webp", extensions: ["webp"] },
  "image/gif": { mime: "image/gif", extensions: ["gif"] },
  "application/pdf": { mime: "application/pdf", extensions: ["pdf"] },
  "text/plain": { mime: "text/plain", extensions: ["txt"] },
};

export class AttachmentInputError extends Error {}

// MIME claims are not enough: validate filename/size here and bytes on the server.
export function validateAttachmentFile(
  file: Pick<File, "name" | "type" | "size">,
) {
  if (!file.size) throw new AttachmentInputError("Choose a non-empty file.");
  if (file.size > MAX_ATTACHMENT_BYTES)
    throw new AttachmentInputError("Files must be 3 MB or smaller.");
  if (
    !file.name.trim() ||
    file.name.length > 255 ||
    [...file.name].some((character) => {
      const code = character.charCodeAt(0);
      return (
        code < 32 || code === 127 || character === "/" || character === "\\"
      );
    })
  )
    throw new AttachmentInputError(
      "Use a filename without paths or control characters, up to 255 characters.",
    );
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  const format = Object.values(formats).find((item) =>
    item.extensions.includes(extension ?? ""),
  );
  if (!format || (file.type && file.type !== format.mime))
    throw new AttachmentInputError(
      "Choose a JPG, PNG, WebP, GIF, PDF, or text file.",
    );
  return format.mime;
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

export function attachmentKey(
  authId: string,
  kind: "task" | "note",
  parentId: string,
  id: string,
) {
  return `${authId}/${kind === "task" ? "tasks" : "notes"}/${parentId}/${id}`;
}

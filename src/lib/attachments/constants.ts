export const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
export const ATTACHMENT_ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,.pdf,.txt";
export const ATTACHMENT_HELP =
  "JPG, PNG, WebP, GIF, PDF, or UTF-8 text. Up to 3 MB per file.";
const formats = [
  { mime: "image/jpeg", extensions: ["jpg", "jpeg"] },
  { mime: "image/png", extensions: ["png"] },
  { mime: "image/webp", extensions: ["webp"] },
  { mime: "image/gif", extensions: ["gif"] },
  { mime: "application/pdf", extensions: ["pdf"] },
  { mime: "text/plain", extensions: ["txt"] },
];

export function attachmentMime(fileName: string) {
  const extension = fileName.split(".").at(-1)?.toLowerCase() ?? "";
  return formats.find((format) => format.extensions.includes(extension))?.mime;
}

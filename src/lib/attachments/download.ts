export async function downloadAttachment(id: string, fileName: string) {
  const response = await fetch(`/api/attachments/${id}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(
      typeof result?.error === "string"
        ? result.error
        : "Unable to download this file. Please try again.",
    );
  }
  if (!response.headers.get("content-disposition"))
    throw new Error("Sign in again to download this file.");
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

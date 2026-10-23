"use client";

import { DownloadIcon, FileImageIcon, FileTextIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { downloadAttachment } from "@/lib/attachments/download";
import type { Attachment } from "@/lib/products/types";
import { AttachmentRemoveDialog } from "./attachment-remove-dialog";

export function AttachmentRow({
  attachment,
  kind,
}: {
  attachment: Attachment;
  kind: "task" | "note";
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const downloadingRef = useRef(false);
  async function download() {
    if (downloadingRef.current) return;
    downloadingRef.current = true;
    setDownloading(true);
    setError("");
    try {
      await downloadAttachment(attachment.id, attachment.name);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Download failed. Please try again.",
      );
    } finally {
      downloadingRef.current = false;
      setDownloading(false);
    }
  }
  return (
    <div className="rounded-lg border p-3" aria-busy={downloading}>
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          {attachment.kind === "image" ? (
            <FileImageIcon className="size-5" />
          ) : (
            <FileTextIcon className="size-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{attachment.name}</p>
          <p className="text-xs text-muted-foreground">{attachment.size}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11"
          aria-label={`Download ${attachment.name}`}
          disabled={downloading}
          onClick={download}
        >
          {downloading ? <Spinner /> : <DownloadIcon />}
        </Button>
        <AttachmentRemoveDialog attachment={attachment} kind={kind} />
      </div>
      {downloading && (
        <output className="text-xs text-muted-foreground">Downloading…</output>
      )}
      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertTitle>Download failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

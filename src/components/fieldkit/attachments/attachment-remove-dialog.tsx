"use client";

import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import { removeAttachment } from "@/app/(workspace)/attachment-actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useWorkspaceFeedback } from "@/hooks/use-workspace-feedback";
import type { Attachment } from "@/lib/products/types";
import type { FormStatus } from "../feedback/workspace-feedback-context";
import { ProductForm } from "../forms/product-form";
import { SaveButton } from "../forms/save-button";

export function AttachmentRemoveDialog({
  attachment,
}: {
  attachment: Attachment;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<FormStatus>({
    dirty: false,
    pending: false,
  });
  const { requestLeave } = useWorkspaceFeedback();
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next, details) => {
        if (!next && status.pending) {
          details.cancel();
          requestLeave(() => setOpen(false));
        } else setOpen(next);
      }}
    >
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11"
            aria-label={`Remove ${attachment.name}`}
          />
        }
      >
        <Trash2Icon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this file?</AlertDialogTitle>
          <AlertDialogDescription>
            “{attachment.name}” will be deleted from storage. This cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ProductForm
          action={removeAttachment}
          warnUnsaved={false}
          pendingLabel="Removing…"
          onStatusChange={setStatus}
          onSuccess={() => setOpen(false)}
        >
          <input type="hidden" name="id" value={attachment.id} />
          <input type="hidden" name="version" value={attachment.version} />
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">
              Keep file
            </AlertDialogCancel>
            <SaveButton destructive>Remove file</SaveButton>
          </AlertDialogFooter>
        </ProductForm>
      </AlertDialogContent>
    </AlertDialog>
  );
}

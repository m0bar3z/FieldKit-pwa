"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2Icon } from "lucide-react";
import { unstable_rethrow } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
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
import { toFormData } from "@/lib/forms/form-data";
import { runServerAction } from "@/lib/forms/server-action";
import { setServerErrors } from "@/lib/forms/server-errors";
import { identitySchema } from "@/lib/products/schemas";
import type { Attachment } from "@/lib/products/types";
import { ProductForm } from "../forms/product-form";
import { SaveButton } from "../forms/save-button";

export function AttachmentRemoveDialog({
  attachment,
}: {
  attachment: Attachment;
}) {
  const [open, setOpen] = useState(false);
  const { notify } = useWorkspaceFeedback();
  const form = useForm<z.infer<typeof identitySchema>>({
    resolver: zodResolver(identitySchema),
    values: { id: attachment.id, version: String(attachment.version) },
  });
  const submitting = useRef(false);

  async function handleSubmit(values: z.infer<typeof identitySchema>) {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const result = await runServerAction(() =>
        removeAttachment({}, toFormData(values)),
      );
      if (setServerErrors(form.setError, result)) return;
      if (result.success) notify(result.success);
      setOpen(false);
    } catch (error) {
      unstable_rethrow(error);
      form.setError("root.server", {
        message: "Unable to remove this file. Please try again.",
      });
    } finally {
      submitting.current = false;
    }
  }
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next, details) => {
        if (form.formState.isSubmitting || submitting.current) details.cancel();
        else {
          if (next)
            form.reset({
              id: attachment.id,
              version: String(attachment.version),
            });
          setOpen(next);
        }
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
          form={form}
          onSubmit={form.handleSubmit(handleSubmit)}
          pendingLabel="Removing…"
        >
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

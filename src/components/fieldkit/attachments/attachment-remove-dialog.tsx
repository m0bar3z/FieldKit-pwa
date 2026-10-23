"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useUser } from "@/components/auth/user-provider";
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
import { useAppFeedback } from "@/hooks/use-app-feedback";
import { ApiRequestError, apiRequest, refreshItems } from "@/lib/api/client";
import { setServerErrors } from "@/lib/forms/server-errors";
import type { FormResponse } from "@/lib/forms/types";
import { identitySchema } from "@/lib/products/schemas";
import type { Attachment } from "@/lib/products/types";
import { ProductForm } from "../forms/product-form";
import { SaveButton } from "../forms/save-button";

export function AttachmentRemoveDialog({
  attachment,
  kind,
}: {
  attachment: Attachment;
  kind: "task" | "note";
}) {
  const [open, setOpen] = useState(false);
  const { notify } = useAppFeedback();
  const user = useUser();
  const form = useForm<z.infer<typeof identitySchema>>({
    resolver: zodResolver(identitySchema),
    values: { id: attachment.id, version: String(attachment.version) },
  });
  const submitting = useRef(false);

  async function handleSubmit(values: z.infer<typeof identitySchema>) {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const result = await apiRequest<FormResponse>(
        `/api/attachments/${values.id}`,
        {
          method: "DELETE",
          headers: { "X-FieldKit-User": user.id },
          body: JSON.stringify({ version: values.version }),
        },
      );
      refreshItems(kind);
      if (result.success) notify(result.success);
      setOpen(false);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setServerErrors(form.setError, error.result);
        return;
      }
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

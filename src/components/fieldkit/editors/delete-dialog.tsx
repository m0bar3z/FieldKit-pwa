"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2Icon } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
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
import { deleteItemSchema } from "@/lib/products/schemas";
import { deleteTask } from "@/lib/products/task-sync";
import type { Task } from "@/lib/products/types";
import { ProductForm } from "../forms/product-form";
import { SaveButton } from "../forms/save-button";

export function DeleteDialog({
  kind,
  title,
  id,
  version,
  task,
  redirect = true,
  onDeleted,
}: {
  kind: "task" | "note";
  title: string;
  id: string;
  version: number;
  task?: Task;
  redirect?: boolean;
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { notify } = useAppFeedback();
  const user = useUser();
  const form = useForm<z.infer<typeof deleteItemSchema>>({
    resolver: zodResolver(deleteItemSchema),
    values: { id, version: String(version), kind },
  });
  const submitting = useRef(false);
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);

  async function handleSubmit(values: z.infer<typeof deleteItemSchema>) {
    if (submitting.current || navigating) return;
    submitting.current = true;
    try {
      if (kind === "task") {
        if (!task) throw new Error("Reload your tasks and try again.");
        const result = await deleteTask(user.id, task);
        notify(result.success);
        setOpen(false);
        onDeleted?.();
        if (redirect) {
          setNavigating(true);
          router.push("/tasks");
        }
        return;
      }
      const result = await apiRequest<FormResponse>(`/api/notes/${values.id}`, {
        method: "DELETE",
        headers: { "X-FieldKit-User": user.id },
        body: JSON.stringify({ version: values.version }),
      });
      if (!result.destination) refreshItems(kind);
      if (result.success) notify(result.success);
      setOpen(false);
      if (result.destination) {
        setNavigating(true);
        router.push(result.destination as Route);
      }
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setServerErrors(form.setError, error.result);
        return;
      }
      form.setError("root.server", {
        message: "Unable to delete this item. Please try again.",
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
          if (next) form.reset({ id, version: String(version), kind });
          setOpen(next);
        }
      }}
    >
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            className="min-h-11 gap-2"
            aria-label={`Delete ${kind}`}
          />
        }
      >
        <Trash2Icon data-icon="inline-start" />
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this {kind}?</AlertDialogTitle>
          <AlertDialogDescription>
            “{title}” will be removed
            {kind === "task"
              ? " along with its attachment metadata and any reminders"
              : " along with its attachment metadata"}
            . Deleted items are hidden from your notes and tasks. There is no
            restore action.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ProductForm
          form={form}
          onSubmit={form.handleSubmit(handleSubmit)}
          navigating={navigating}
          pendingLabel={navigating ? "Opening dashboard…" : "Deleting…"}
        >
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">
              Keep {kind}
            </AlertDialogCancel>
            <SaveButton destructive>Delete {kind}</SaveButton>
          </AlertDialogFooter>
        </ProductForm>
      </AlertDialogContent>
    </AlertDialog>
  );
}

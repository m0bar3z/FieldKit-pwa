"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PencilIcon } from "lucide-react";
import { unstable_rethrow } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { updateNote, updateTask } from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useWorkspaceFeedback } from "@/hooks/use-workspace-feedback";
import { toFormData } from "@/lib/forms/form-data";
import { runServerAction } from "@/lib/forms/server-action";
import { setServerErrors } from "@/lib/forms/server-errors";
import { itemFormValues } from "@/lib/products/form-values";
import { type ItemFormValues, itemFormSchema } from "@/lib/products/schemas";
import type { Note, Task } from "@/lib/products/types";
import { ProductForm } from "../forms/product-form";
import { SaveButton } from "../forms/save-button";
import { ItemFields } from "./item-fields";

export function EditItemDialog({ task, note }: { task?: Task; note?: Note }) {
  const kind = task ? "task" : "note";
  const [open, setOpen] = useState(false);
  const { notify } = useWorkspaceFeedback();
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    values: itemFormValues(kind, task ?? note),
  });
  const submitting = useRef(false);

  async function handleSubmit(values: ItemFormValues) {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const action = task ? updateTask : updateNote;
      const result = await runServerAction(() =>
        action({}, toFormData(values)),
      );
      if (setServerErrors(form.setError, result)) return;
      if (result.success) notify(result.success);
      setOpen(false);
    } catch (error) {
      unstable_rethrow(error);
      form.setError("root.server", {
        message: "Unable to save changes. Please try again.",
      });
    } finally {
      submitting.current = false;
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next, details) => {
        if (form.formState.isSubmitting || submitting.current) details.cancel();
        else {
          if (next) form.reset(itemFormValues(kind, task ?? note));
          setOpen(next);
        }
      }}
    >
      <DialogTrigger
        render={<Button variant="outline" className="min-h-11 gap-2 px-4" />}
      >
        <PencilIcon data-icon="inline-start" />
        Edit {kind}
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit {kind}</DialogTitle>
          <DialogDescription>
            Make a little room for a better plan.
          </DialogDescription>
        </DialogHeader>
        <ProductForm form={form} onSubmit={form.handleSubmit(handleSubmit)}>
          <ItemFields kind={kind} prefix={`edit-${kind}`} />
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" className="min-h-11" />}
            >
              Cancel
            </DialogClose>
            <SaveButton>Save changes</SaveButton>
          </DialogFooter>
        </ProductForm>
      </DialogContent>
    </Dialog>
  );
}

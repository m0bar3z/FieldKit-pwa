"use client";

import { PencilIcon } from "lucide-react";
import { useState } from "react";
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
import type { Note, Task } from "@/lib/products/types";
import type { FormStatus } from "../feedback/workspace-feedback-context";
import { ProductForm } from "../forms/product-form";
import { SaveButton } from "../forms/save-button";
import { ItemFields } from "./item-fields";

export function EditItemDialog({ task, note }: { task?: Task; note?: Note }) {
  const kind = task ? "task" : "note";
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<FormStatus>({
    dirty: false,
    pending: false,
  });
  const { requestLeave } = useWorkspaceFeedback();
  return (
    <Dialog
      open={open}
      onOpenChange={(next, details) => {
        if (!next && (status.dirty || status.pending)) {
          details.cancel();
          requestLeave(() => setOpen(false));
        } else setOpen(next);
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
        <ProductForm
          action={task ? updateTask : updateNote}
          onStatusChange={setStatus}
          onSuccess={() => setOpen(false)}
        >
          <ItemFields
            kind={kind}
            task={task}
            note={note}
            prefix={`edit-${kind}`}
          />
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

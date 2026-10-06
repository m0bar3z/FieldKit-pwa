"use client";

import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import { deleteItem } from "@/app/(workspace)/actions";
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
import { ProductForm, SaveButton } from "./product-form";
import { type FormStatus, useWorkspaceFeedback } from "./workspace-feedback";

export function DeleteDialog({
  kind,
  title,
  id,
  version,
}: {
  kind: "project" | "task" | "note";
  title: string;
  id: string;
  version: number;
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
            {kind === "project"
              ? " along with its tasks, notes, attachment metadata, and reminders"
              : kind === "task"
                ? " along with its attachment metadata and any reminders"
                : " along with its attachment metadata"}
            . Deleted items are hidden from your workspace. There is no restore
            action.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/* TODO(PWA): Queue the deletion for offline synchronization. */}
        <ProductForm
          action={deleteItem}
          warnUnsaved={false}
          pendingLabel="Deleting…"
          onStatusChange={setStatus}
          onSuccess={() => setOpen(false)}
        >
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="version" value={version} />
          <input type="hidden" name="kind" value={kind} />
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

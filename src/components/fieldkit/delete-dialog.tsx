import { Trash2Icon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function DeleteDialog({
  kind,
  title,
}: {
  kind: "project" | "task" | "note";
  title: string;
}) {
  return (
    <AlertDialog>
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
            {kind === "project" ? " along with its tasks and notes" : ""}. This
            is a design preview; nothing will be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/* TODO(product): Confirm deletion, define related-item handling, and return to the parent page. */}
        {/* TODO(PWA): Queue the deletion for offline synchronization. */}
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11">
            Keep {kind}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled
            className="min-h-11"
          >
            Delete {kind}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

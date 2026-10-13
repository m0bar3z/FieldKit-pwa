"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function UnsavedChangesDialog({
  leave,
  onClose,
}: {
  leave: (() => void) | null;
  onClose: () => void;
}) {
  return (
    <AlertDialog
      open={Boolean(leave)}
      onOpenChange={(open) => !open && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>
            Your changes have not been saved. Keep editing or discard them to
            leave.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11">
            Keep editing
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            className="min-h-11"
            onClick={() => {
              const next = leave;
              onClose();
              // Keep guarding any forms that remain mounted (including when
              // the chosen link points to the current route).
              next?.();
            }}
          >
            Discard changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

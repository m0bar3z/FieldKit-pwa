"use client";

import { unstable_rethrow } from "next/navigation";
import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { uploadAttachment } from "@/app/(workspace)/attachment-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useWorkspaceFeedback } from "@/hooks/use-workspace-feedback";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_HELP,
  validateAttachmentFile,
} from "@/lib/attachments/input";
import type { ProductActionState } from "@/lib/products/input";

export function AttachmentUploadForm({
  kind,
  parentId,
  close,
}: {
  kind: "task" | "note";
  parentId: string;
  close: () => void;
}) {
  const id = useId();
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState("");
  const submitting = useRef(false);
  const { setGuard, notify, requestLeave } = useWorkspaceFeedback();
  const [state, dispatch, pending] = useActionState<
    ProductActionState,
    FormData
  >(async (previous, form) => {
    try {
      const result = await uploadAttachment(previous, form);
      if (result.success) {
        setGuard(id, null);
        notify(result.success);
        close();
      }
      return result;
    } catch (error) {
      unstable_rethrow(error);
      return { error: "Upload failed. Please try again." };
    } finally {
      submitting.current = false;
    }
  }, {});
  useEffect(() => {
    setGuard(id, { dirty: Boolean(file), pending });
  }, [id, file, pending, setGuard]);
  useEffect(() => () => setGuard(id, null), [id, setGuard]);
  const error = validationError || state.error;
  return (
    <form
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        if (submitting.current || pending || !file || validationError) return;
        submitting.current = true;
        const form = new FormData(event.currentTarget);
        form.set("kind", kind);
        form.set("parentId", parentId);
        setGuard(id, { dirty: true, pending: true });
        // Manual dispatch keeps the native selection available after a failure.
        startTransition(() => dispatch(form));
      }}
    >
      <FieldGroup>
        <Field data-invalid={Boolean(validationError)} data-disabled={pending}>
          <FieldLabel htmlFor={id}>Choose an attachment</FieldLabel>
          <Input
            id={id}
            name="file"
            type="file"
            accept={ATTACHMENT_ACCEPT}
            required
            disabled={pending}
            aria-invalid={Boolean(validationError)}
            aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
            onChange={(event) => {
              const selected = event.target.files?.[0] ?? null;
              setValidationError("");
              try {
                if (selected) validateAttachmentFile(selected);
                setFile(selected);
                setGuard(id, { dirty: Boolean(selected), pending: false });
              } catch (error) {
                setFile(null);
                setGuard(id, null);
                setValidationError(
                  error instanceof Error
                    ? error.message
                    : "Choose another file.",
                );
              }
            }}
          />
          <FieldDescription id={`${id}-help`}>
            {ATTACHMENT_HELP}
          </FieldDescription>
        </Field>
        {error && !pending && (
          <Alert id={`${id}-error`} variant="destructive">
            <AlertTitle>File was not uploaded</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {pending && (
          <output className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner /> Uploading…
          </output>
        )}
        <Field orientation="horizontal">
          <Button
            type="submit"
            disabled={pending || !file || Boolean(validationError)}
            className="min-h-11"
          >
            {pending && <Spinner data-icon="inline-start" />}
            {pending ? "Uploading…" : "Upload file"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            className="min-h-11"
            onClick={() => requestLeave(close)}
          >
            Cancel
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}

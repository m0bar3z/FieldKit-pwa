"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useRef } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
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
  ApiRequestError,
  apiRequest,
  refreshWorkspace,
} from "@/lib/api/client";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_HELP,
} from "@/lib/attachments/constants";
import { uploadAttachmentSchema } from "@/lib/attachments/schemas";
import { toFormData } from "@/lib/forms/form-data";
import { setServerErrors } from "@/lib/forms/server-errors";
import type { FormResponse } from "@/lib/forms/types";

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
  const { notify } = useWorkspaceFeedback();
  const form = useForm<z.infer<typeof uploadAttachmentSchema>>({
    resolver: zodResolver(uploadAttachmentSchema),
    defaultValues: { kind, parentId, file: null },
    mode: "onChange",
  });
  const submitting = useRef(false);
  const pending = form.formState.isSubmitting;
  const file = useWatch({ control: form.control, name: "file" });

  async function handleSubmit(values: z.infer<typeof uploadAttachmentSchema>) {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const result = await apiRequest<FormResponse>("/api/attachments", {
        method: "POST",
        body: toFormData(values),
      });
      refreshWorkspace();
      if (result.success) notify(result.success);
      close();
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setServerErrors(form.setError, error.result);
        return;
      }
      form.setError("root.server", {
        message: "Upload failed. Please try again.",
      });
    } finally {
      submitting.current = false;
    }
  }
  const errors = form.formState.errors;
  const error =
    errors.file?.message ||
    errors.parentId?.message ||
    errors.kind?.message ||
    errors.root?.server?.message;
  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(handleSubmit)}
      aria-busy={pending}
    >
      <FieldGroup>
        <Controller
          name="file"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} data-disabled={pending}>
              <FieldLabel htmlFor={id}>Choose an attachment</FieldLabel>
              <Input
                ref={field.ref}
                onBlur={field.onBlur}
                name={field.name}
                id={id}
                type="file"
                accept={ATTACHMENT_ACCEPT}
                required
                disabled={pending}
                aria-invalid={fieldState.invalid}
                aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
                onChange={(event) =>
                  field.onChange(event.target.files?.[0] ?? null)
                }
              />
              <FieldDescription id={`${id}-help`}>
                {ATTACHMENT_HELP}
              </FieldDescription>
            </Field>
          )}
        />
        {error && !pending && (
          <Alert id={`${id}-error`} variant="destructive" tabIndex={-1}>
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
            disabled={pending || !file || Boolean(errors.file)}
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
            onClick={close}
          >
            Cancel
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}

"use client";

import {
  DownloadIcon,
  FileImageIcon,
  FileTextIcon,
  PaperclipIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { unstable_rethrow } from "next/navigation";
import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  removeAttachment,
  uploadAttachment,
} from "@/app/(workspace)/attachment-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_HELP,
  validateAttachmentFile,
} from "@/lib/attachment-input";
import type { ProductActionState } from "@/lib/product-input";
import type { Attachment } from "@/lib/product-types";
import { EmptyItems } from "./empty-items";
import { ProductForm, SaveButton } from "./product-form";
import { type FormStatus, useWorkspaceFeedback } from "./workspace-feedback";

function UploadForm({
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

function RemoveFile({ attachment }: { attachment: Attachment }) {
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
          action={removeAttachment}
          warnUnsaved={false}
          pendingLabel="Removing…"
          onStatusChange={setStatus}
          onSuccess={() => setOpen(false)}
        >
          <input type="hidden" name="id" value={attachment.id} />
          <input type="hidden" name="version" value={attachment.version} />
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

function AttachmentRow({ attachment }: { attachment: Attachment }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const downloadingRef = useRef(false);
  async function download() {
    if (downloadingRef.current) return;
    downloadingRef.current = true;
    setDownloading(true);
    setError("");
    try {
      const response = await fetch(`/api/attachments/${attachment.id}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(
          typeof result?.error === "string"
            ? result.error
            : "Unable to download this file. Please try again.",
        );
      }
      if (!response.headers.get("content-disposition"))
        throw new Error("Sign in again to download this file.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.name;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Download failed. Please try again.",
      );
    } finally {
      downloadingRef.current = false;
      setDownloading(false);
    }
  }
  return (
    <div className="rounded-lg border p-3" aria-busy={downloading}>
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          {attachment.kind === "image" ? (
            <FileImageIcon className="size-5" />
          ) : (
            <FileTextIcon className="size-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{attachment.name}</p>
          <p className="text-xs text-muted-foreground">{attachment.size}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11"
          aria-label={`Download ${attachment.name}`}
          disabled={downloading}
          onClick={download}
        >
          {downloading ? <Spinner /> : <DownloadIcon />}
        </Button>
        <RemoveFile attachment={attachment} />
      </div>
      {downloading && (
        <output className="text-xs text-muted-foreground">Downloading…</output>
      )}
      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertTitle>Download failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export function Attachments({
  items,
  kind,
  parentId,
}: {
  items: Attachment[];
  kind: "task" | "note";
  parentId: string;
}) {
  const [choosing, setChoosing] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PaperclipIcon className="size-4" />
          Attachments
        </CardTitle>
        <CardDescription>
          Keep useful files close to your ideas.
        </CardDescription>
        <CardAction>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={choosing}
            onClick={() => setChoosing(true)}
          >
            <PlusIcon data-icon="inline-start" />
            Add file
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {choosing && (
          <UploadForm
            kind={kind}
            parentId={parentId}
            close={() => setChoosing(false)}
          />
        )}
        {/* TODO(PWA): Store attachment blobs locally and upload them after reconnecting. */}
        {items.length === 0 ? (
          <EmptyItems
            kind="attachments"
            title="A little extra context"
            description="Add a photo, document, or text file to this item."
          />
        ) : (
          items.map((attachment) => (
            <AttachmentRow key={attachment.id} attachment={attachment} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

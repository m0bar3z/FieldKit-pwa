"use client";

import { AlertCircleIcon } from "lucide-react";
import type { Route } from "next";
import { unstable_rethrow, useRouter } from "next/navigation";
import {
  type ReactNode,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useWorkspaceFeedback } from "@/hooks/use-workspace-feedback";
import { snapshotForm } from "@/lib/forms/snapshot";
import type { ProductActionState } from "@/lib/products/input";
import type { FormStatus } from "../feedback/workspace-feedback-context";
import { FormContext, type ProductAction } from "./product-form-context";

export function ProductForm({
  action,
  children,
  warnUnsaved = true,
  pendingLabel = "Saving…",
  onStatusChange,
  onSuccess,
}: {
  action: ProductAction;
  children: ReactNode;
  warnUnsaved?: boolean;
  pendingLabel?: string;
  onStatusChange?: ((status: FormStatus) => void) | undefined;
  onSuccess?: (() => void) | undefined;
}) {
  const router = useRouter();
  const { setGuard, notify } = useWorkspaceFeedback();
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const initialValues = useRef("");
  const submitting = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [state, formAction, saving] = useActionState<
    ProductActionState,
    FormData
  >(async (previous, form) => {
    let leaving = false;
    try {
      const result = await action(previous, form);
      if (result.success) {
        setDirty(false);
        setGuard(id, null);
        notify(result.success);
        onSuccess?.();
        if (result.destination) {
          leaving = true;
          setNavigating(true);
          router.push(result.destination as Route);
        }
      }
      return result;
    } catch (error) {
      unstable_rethrow(error);
      return { error: "Unable to save changes. Please try again." };
    } finally {
      // Keep a successful creation locked until its destination opens.
      if (!leaving) submitting.current = false;
    }
  }, {});
  const pending = saving || navigating;
  const busyLabel = navigating ? "Opening saved item…" : pendingLabel;
  useEffect(() => {
    if (formRef.current) initialValues.current = snapshotForm(formRef.current);
  }, []);
  useEffect(() => {
    const status = { dirty: warnUnsaved && dirty, pending };
    setGuard(id, status);
    onStatusChange?.(status);
  }, [dirty, pending, warnUnsaved, id, setGuard, onStatusChange]);
  useEffect(() => () => setGuard(id, null), [id, setGuard]);
  useEffect(() => {
    if (state.error && !saving) {
      const form = formRef.current;
      const target =
        form?.querySelector<HTMLElement>('[aria-invalid="true"]') ??
        form?.querySelector<HTMLElement>("[data-form-error]");
      target?.focus();
    }
  }, [state, saving]);

  return (
    <FormContext value={{ state, pending, pendingLabel: busyLabel }}>
      <form
        ref={formRef}
        action={formAction}
        className="flex flex-col gap-5"
        aria-busy={pending}
        onChange={(event) => {
          if (pending || !warnUnsaved) return;
          const changed =
            snapshotForm(event.currentTarget) !== initialValues.current;
          setDirty(changed);
          setGuard(id, { dirty: changed, pending: false });
        }}
        onSubmit={(event) => {
          if (submitting.current || pending) {
            event.preventDefault();
            return;
          }
          submitting.current = true;
          setGuard(id, { dirty: warnUnsaved && dirty, pending: true });
          onStatusChange?.({ dirty: warnUnsaved && dirty, pending: true });
        }}
      >
        {(pending || dirty) && (
          <output className="flex items-center gap-2 px-4 text-sm text-muted-foreground">
            {pending ? (
              <>
                <Spinner />
                {busyLabel}
              </>
            ) : (
              "Unsaved changes"
            )}
          </output>
        )}
        {state.error && !pending && (
          <Alert variant="destructive" tabIndex={-1} data-form-error>
            <AlertCircleIcon />
            <AlertTitle>Changes were not saved</AlertTitle>
            <AlertDescription>
              {state.error}
              {warnUnsaved && " Your entries are kept below."}
            </AlertDescription>
          </Alert>
        )}
        <fieldset disabled={pending} className="flex min-w-0 flex-col gap-5">
          {children}
        </fieldset>
      </form>
    </FormContext>
  );
}

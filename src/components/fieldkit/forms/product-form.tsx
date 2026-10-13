"use client";

import { AlertCircleIcon } from "lucide-react";
import type { FormEventHandler, ReactNode } from "react";
import {
  type FieldValues,
  FormProvider,
  type Path,
  type UseFormReturn,
} from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { FormContext } from "./product-form-context";

export function ProductForm<T extends FieldValues>({
  form,
  onSubmit,
  children,
  pendingLabel = "Saving…",
  navigating = false,
}: {
  form: UseFormReturn<T>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
  pendingLabel?: string;
  navigating?: boolean;
}) {
  const pending = form.formState.isSubmitting || navigating;
  const errors = form.formState.errors;
  const error =
    errors.root?.server?.message ||
    ["id", "version", "kind"]
      .map((name) => form.getFieldState(name as Path<T>).error?.message)
      .find(Boolean);
  return (
    <FormProvider {...form}>
      <FormContext value={{ pending, pendingLabel }}>
        <form
          noValidate
          onSubmit={onSubmit}
          className="flex flex-col gap-5"
          aria-busy={pending}
        >
          {pending && (
            <output className="flex items-center gap-2 px-4 text-sm text-muted-foreground">
              <Spinner /> {pendingLabel}
            </output>
          )}
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertCircleIcon />
              <AlertTitle>Changes were not saved</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <fieldset disabled={pending} className="flex min-w-0 flex-col gap-5">
            {children}
          </fieldset>
        </form>
      </FormContext>
    </FormProvider>
  );
}

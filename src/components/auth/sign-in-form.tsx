"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { unstable_rethrow } from "next/navigation";
import { useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { signIn } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { type Credentials, signInSchema } from "@/lib/auth/schemas";
import { toFormData } from "@/lib/forms/form-data";
import { runServerAction } from "@/lib/forms/server-action";
import { setServerErrors } from "@/lib/forms/server-errors";
import { CredentialsFields } from "./credentials-fields";

export function SignInForm({
  next,
  configured,
}: {
  next: string;
  configured: boolean;
}) {
  const form = useForm<Credentials>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });
  const submitting = useRef(false);
  const pending = form.formState.isSubmitting;
  const error = form.formState.errors.root?.server?.message;

  async function handleSubmit(values: Credentials) {
    if (!configured || submitting.current) return;
    submitting.current = true;
    try {
      const result = await runServerAction(() =>
        signIn({}, toFormData({ ...values, next })),
      );
      if (setServerErrors(form.setError, result)) return;
    } catch (error) {
      unstable_rethrow(error);
      form.setError("root.server", {
        message: "Unable to sign in. Please try again.",
      });
    } finally {
      submitting.current = false;
    }
  }

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-6"
        aria-busy={pending}
      >
        <CredentialsFields disabled={pending || !configured} />
        {(!configured || error) && (
          <FieldError tabIndex={-1} role="alert">
            {error ?? "Sign-in is unavailable. Please try again later."}
          </FieldError>
        )}
        <Button
          type="submit"
          disabled={pending || !configured}
          className="min-h-11 w-full"
        >
          {pending && <Spinner data-icon="inline-start" />}
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </FormProvider>
  );
}

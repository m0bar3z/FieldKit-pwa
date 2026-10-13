"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { unstable_rethrow } from "next/navigation";
import { useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { signUp } from "@/app/register/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { type Credentials, signUpSchema } from "@/lib/auth/schemas";
import { toFormData } from "@/lib/forms/form-data";
import { runServerAction } from "@/lib/forms/server-action";
import { setServerErrors } from "@/lib/forms/server-errors";
import { CredentialsFields } from "./credentials-fields";

export function SignUpForm({ configured }: { configured: boolean }) {
  const form = useForm<Credentials>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "" },
  });
  const submitting = useRef(false);
  const pending = form.formState.isSubmitting;
  const error = form.formState.errors.root?.server?.message;
  const [message, setMessage] = useState("");

  async function handleSubmit(values: Credentials) {
    if (!configured || submitting.current) return;
    submitting.current = true;
    try {
      const result = await runServerAction(() =>
        signUp({}, toFormData(values)),
      );
      if (setServerErrors(form.setError, result)) return;
      if (result.message) {
        form.reset({ ...values, password: "" });
        setMessage(result.message);
      }
    } catch (error) {
      unstable_rethrow(error);
      form.setError("root.server", {
        message: "Unable to create an account. Please try again.",
      });
    } finally {
      submitting.current = false;
    }
  }

  if (message)
    return (
      <Alert role="status">
        <AlertTitle>Check your email</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    );
  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-6"
        aria-busy={pending}
      >
        <CredentialsFields registration disabled={pending || !configured} />
        {(!configured || error) && (
          <Alert variant="destructive" tabIndex={-1}>
            <AlertDescription>
              {error ?? "Registration is unavailable. Please try again later."}
            </AlertDescription>
          </Alert>
        )}
        <Button
          type="submit"
          disabled={pending || !configured}
          className="min-h-11 w-full"
        >
          {pending && <Spinner data-icon="inline-start" />}
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </FormProvider>
  );
}

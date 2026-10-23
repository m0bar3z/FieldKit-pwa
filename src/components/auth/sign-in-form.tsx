"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { ApiRequestError, apiRequest } from "@/lib/api/client";
import { type Credentials, signInSchema } from "@/lib/auth/schemas";
import { setServerErrors } from "@/lib/forms/server-errors";
import type { FormResponse } from "@/lib/forms/types";
import { resetSessionCache } from "@/lib/pwa/session-cache";
import { CredentialsFields } from "./credentials-fields";

export function SignInForm({ next }: { next: string }) {
  const form = useForm<Credentials>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });
  const submitting = useRef(false);
  const [navigating, setNavigating] = useState(false);
  const pending = form.formState.isSubmitting || navigating;
  const error = form.formState.errors.root?.server?.message;

  async function handleSubmit(values: Credentials) {
    if (submitting.current || navigating) return;
    submitting.current = true;
    try {
      const result = await apiRequest<FormResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ ...values, next }),
      });
      await resetSessionCache();
      setNavigating(true);
      // A full navigation drops any prefetched pages from the previous session.
      window.location.assign(result.destination ?? "/");
    } catch (error) {
      if (error instanceof ApiRequestError)
        setServerErrors(form.setError, error.result);
      else
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
        <CredentialsFields disabled={pending} />
        {error && <FieldError role="alert">{error}</FieldError>}
        <Button type="submit" disabled={pending} className="min-h-11 w-full">
          {pending && <Spinner data-icon="inline-start" />}
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </FormProvider>
  );
}

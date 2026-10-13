"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { unstable_rethrow } from "next/navigation";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { emptyFormSchema } from "@/lib/forms/schemas";
import { runServerAction } from "@/lib/forms/server-action";
import { setServerErrors } from "@/lib/forms/server-errors";

export function SignOutButton() {
  const form = useForm({
    resolver: zodResolver(emptyFormSchema),
    defaultValues: {},
  });
  const submitting = useRef(false);
  const pending = form.formState.isSubmitting;
  const error = form.formState.errors.root?.server?.message;

  async function handleSubmit() {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const result = await runServerAction(signOut);
      setServerErrors(form.setError, result);
    } catch (error) {
      unstable_rethrow(error);
      form.setError("root.server", {
        message: "Unable to sign out. Please try again.",
      });
    } finally {
      submitting.current = false;
    }
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-1"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        if (pending || submitting.current) return;
        void form.handleSubmit(handleSubmit)();
      }}
    >
      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        className="min-h-11"
      >
        {pending && <Spinner data-icon="inline-start" />}
        {pending ? "Signing out…" : "Sign out"}
      </Button>
      {error && <FieldError role="alert">{error}</FieldError>}
    </form>
  );
}

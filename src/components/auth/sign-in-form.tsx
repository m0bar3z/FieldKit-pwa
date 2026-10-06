"use client";

import { unstable_rethrow } from "next/navigation";
import { useActionState, useRef } from "react";
import { signIn } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { SignInState } from "@/lib/auth-input";

const initialState: SignInState = {};

export function SignInForm({
  next,
  configured,
}: {
  next: string;
  configured: boolean;
}) {
  const submitting = useRef(false);
  const [state, action, pending] = useActionState(
    async (previous: SignInState, form: FormData) => {
      try {
        return await signIn(previous, form);
      } catch (error) {
        unstable_rethrow(error);
        return { error: "Unable to sign in. Please try again." };
      } finally {
        submitting.current = false;
      }
    },
    initialState,
  );
  return (
    <form
      action={action}
      className="flex flex-col gap-6"
      aria-busy={pending}
      onSubmit={(event) => {
        if (submitting.current || pending || !configured)
          event.preventDefault();
        else submitting.current = true;
      }}
    >
      <input type="hidden" name="next" value={next} />
      <FieldGroup>
        <Field data-invalid={Boolean(state.errors?.email)}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            maxLength={254}
            disabled={pending || !configured}
            aria-invalid={Boolean(state.errors?.email)}
            aria-describedby={state.errors?.email ? "email-error" : undefined}
          />
          {state.errors?.email && (
            <FieldError id="email-error">{state.errors.email}</FieldError>
          )}
        </Field>
        <Field data-invalid={Boolean(state.errors?.password)}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={1024}
            disabled={pending || !configured}
            aria-invalid={Boolean(state.errors?.password)}
            aria-describedby={
              state.errors?.password ? "password-error" : undefined
            }
          />
          {state.errors?.password && (
            <FieldError id="password-error">{state.errors.password}</FieldError>
          )}
        </Field>
      </FieldGroup>
      {(!configured || state.error) && (
        <FieldError role="alert">
          {state.error ?? "Sign-in is unavailable. Please try again later."}
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
  );
}

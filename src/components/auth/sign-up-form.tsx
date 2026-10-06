"use client";

import { unstable_rethrow } from "next/navigation";
import { useActionState, useRef, useState } from "react";
import { signUp } from "@/app/register/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { SignUpState } from "@/lib/auth-input";

const initialState: SignUpState = {};

export function SignUpForm({ configured }: { configured: boolean }) {
  const submitting = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, action, pending] = useActionState(
    async (previous: SignUpState, form: FormData) => {
      try {
        const result = await signUp(previous, form);
        if (result.message) setPassword("");
        return result;
      } catch (error) {
        unstable_rethrow(error);
        return { error: "Unable to create an account. Please try again." };
      } finally {
        submitting.current = false;
      }
    },
    initialState,
  );

  if (state.message) {
    return (
      <Alert role="status">
        <AlertTitle>Check your email</AlertTitle>
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    );
  }

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
      <FieldGroup>
        <Field data-invalid={Boolean(state.errors?.email)}>
          <FieldLabel htmlFor="register-email">Email</FieldLabel>
          <Input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={pending || !configured}
            aria-invalid={Boolean(state.errors?.email)}
            aria-describedby={
              state.errors?.email ? "register-email-error" : undefined
            }
          />
          {state.errors?.email && (
            <FieldError id="register-email-error">
              {state.errors.email}
            </FieldError>
          )}
        </Field>
        <Field data-invalid={Boolean(state.errors?.password)}>
          <FieldLabel htmlFor="register-password">Password</FieldLabel>
          <Input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={1024}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={pending || !configured}
            aria-invalid={Boolean(state.errors?.password)}
            aria-describedby={
              state.errors?.password
                ? "register-password-error"
                : "register-password-help"
            }
          />
          <FieldDescription id="register-password-help">
            Use at least 8 characters.
          </FieldDescription>
          {state.errors?.password && (
            <FieldError id="register-password-error">
              {state.errors.password}
            </FieldError>
          )}
        </Field>
      </FieldGroup>
      {(!configured || state.error) && (
        <Alert variant="destructive">
          <AlertDescription>
            {state.error ??
              "Registration is unavailable. Please try again later."}
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
  );
}

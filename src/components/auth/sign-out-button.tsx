"use client";

import { unstable_rethrow } from "next/navigation";
import { useActionState, useRef } from "react";
import { signOut } from "@/app/login/actions";
import { useWorkspaceFeedback } from "@/components/fieldkit/workspace-feedback";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import type { SignInState } from "@/lib/auth-input";

const initialState: SignInState = {};

export function SignOutButton() {
  const submitting = useRef(false);
  const approved = useRef(false);
  const { hasBlockingChanges, requestLeave } = useWorkspaceFeedback();
  const [state, action, pending] = useActionState(async () => {
    try {
      return await signOut();
    } catch (error) {
      unstable_rethrow(error);
      return { error: "Unable to sign out. Please try again." };
    } finally {
      submitting.current = false;
    }
  }, initialState);
  return (
    <form
      action={action}
      className="flex flex-col gap-1"
      aria-busy={pending}
      onSubmit={(event) => {
        if (submitting.current || pending) {
          event.preventDefault();
          return;
        }
        if (!approved.current && hasBlockingChanges()) {
          event.preventDefault();
          const form = event.currentTarget;
          requestLeave(() => {
            approved.current = true;
            form.requestSubmit();
          });
          return;
        }
        approved.current = false;
        submitting.current = true;
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
      {state.error && <FieldError role="alert">{state.error}</FieldError>}
    </form>
  );
}

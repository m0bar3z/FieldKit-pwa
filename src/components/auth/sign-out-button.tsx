"use client";

import { useActionState } from "react";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import type { SignInState } from "@/lib/auth-input";

const initialState: SignInState = {};

export function SignOutButton() {
  const [state, action, pending] = useActionState(signOut, initialState);
  return (
    <form action={action} className="flex flex-col gap-1">
      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        className="min-h-11"
      >
        {pending ? "Signing out…" : "Sign out"}
      </Button>
      {state.error && <FieldError role="alert">{state.error}</FieldError>}
    </form>
  );
}

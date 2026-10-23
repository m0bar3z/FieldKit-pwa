"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { apiRequest } from "@/lib/api/client";
import { updateAppBadge } from "@/lib/pwa/app-badge";

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError("");
    try {
      await apiRequest("/api/auth/session", { method: "DELETE" });
      await updateAppBadge(0);
      window.location.assign("/login");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to sign out. Please try again.",
      );
      setPending(false);
      submitting.current = false;
    }
  }
  return (
    <form
      className="flex flex-col gap-1"
      aria-busy={pending}
      onSubmit={handleSubmit}
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

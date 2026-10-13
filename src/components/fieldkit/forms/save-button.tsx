"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useProductForm } from "@/hooks/use-product-form";

export function SaveButton({
  children,
  destructive = false,
  disabled = false,
}: {
  children: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const { pending, pendingLabel } = useProductForm();
  return (
    <Button
      type="submit"
      variant={destructive ? "destructive" : "default"}
      disabled={pending || disabled}
      className="min-h-11"
    >
      {pending && <Spinner data-icon="inline-start" />}
      {pending ? pendingLabel : children}
    </Button>
  );
}

"use client";

import type { ReactNode } from "react";

export function PreviewForm({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <form
      className={className}
      onSubmit={(event) => {
        // UI preview: pressing Enter must not submit, navigate, or send a request.
        event.preventDefault();
        // TODO(product): Validate fields and connect the appropriate create/update action.
        // TODO(PWA): Queue mutations locally when offline persistence is introduced.
      }}
    >
      {children}
    </form>
  );
}

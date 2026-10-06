"use client";

import type { Route } from "next";
import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import { useOptionalWorkspaceFeedback } from "./workspace-feedback";

export function WorkspaceLink<T extends string>({
  href,
  onNavigate,
  ...props
}: Omit<LinkProps<T>, "href"> & { href: Route<T> }) {
  // Next.js can render not-found links outside the workspace layout.
  const feedback = useOptionalWorkspaceFeedback();
  const router = useRouter();
  return (
    <Link
      {...props}
      href={href}
      onNavigate={(event) => {
        if (!feedback?.hasBlockingChanges()) {
          onNavigate?.(event);
          return;
        }
        event.preventDefault();
        feedback.requestLeave(() => {
          const navigate = props.replace ? router.replace : router.push;
          navigate(href, { scroll: props.scroll ?? true });
        });
      }}
    />
  );
}

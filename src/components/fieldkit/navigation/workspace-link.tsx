"use client";

import type { Route } from "next";
import Link, { type LinkProps } from "next/link";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function WorkspaceLink<T extends string>(
  props: Omit<LinkProps<T>, "href"> & { href: Route<T> },
) {
  const isOnline = useOnlineStatus();
  return (
    <Link {...props} prefetch={isOnline ? (props.prefetch ?? null) : false} />
  );
}

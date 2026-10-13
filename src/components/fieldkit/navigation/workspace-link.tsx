"use client";

import type { Route } from "next";
import Link, { type LinkProps } from "next/link";

export function WorkspaceLink<T extends string>(
  props: Omit<LinkProps<T>, "href"> & { href: Route<T> },
) {
  return <Link {...props} />;
}

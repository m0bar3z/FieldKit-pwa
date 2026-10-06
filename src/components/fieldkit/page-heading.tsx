import { ArrowLeftIcon } from "lucide-react";
import type { Route } from "next";
import type { ReactNode } from "react";
import { WorkspaceLink as Link } from "@/components/fieldkit/workspace-link";

export function PageHeading<T extends string>({
  eyebrow,
  title,
  description,
  actions,
  back,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  back?: { href: Route<T>; label: string };
}) {
  return (
    <div className="flex flex-col gap-5">
      {back && (
        <Link
          href={back.href}
          className="inline-flex min-h-11 w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            {eyebrow}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

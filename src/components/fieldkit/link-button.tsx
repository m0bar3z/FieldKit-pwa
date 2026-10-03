import type { VariantProps } from "class-variance-authority";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Links retain their link semantics; Base UI Button is reserved for actions.
export function LinkButton<T extends string>({
  href,
  children,
  className,
  variant = "default",
}: {
  href: Route<T>;
  children: ReactNode;
  className?: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
}) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant }),
        "min-h-11 gap-2 px-4 [&_svg]:size-4",
        className,
      )}
    >
      {children}
    </Link>
  );
}

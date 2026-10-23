"use client";

import { ArrowUpRightIcon, BookOpenIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { isAppRouteActive, primaryNavigation } from "@/lib/navigation/app";
import { cn } from "@/lib/shared/utils";
import { AppLink as Link } from "./app-link";

export function AppNavigation({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="App navigation" className="flex flex-col gap-7">
      <div className="flex flex-col gap-1">
        {primaryNavigation.map(({ href, label, icon: Icon }) => {
          const active = isAppRouteActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className={cn(
                buttonVariants({ variant: active ? "secondary" : "ghost" }),
                "min-h-11 justify-start gap-3 px-3 [&_svg]:size-4",
              )}
            >
              <Icon />
              {label}
            </Link>
          );
        })}
      </div>
      <Separator />
      <Link
        href="/notes/new"
        onClick={onNavigate}
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "min-h-11 justify-start gap-3 px-3 [&_svg]:size-4",
        )}
      >
        <BookOpenIcon />
        Write a note
        <ArrowUpRightIcon className="ml-auto" />
      </Link>
    </nav>
  );
}

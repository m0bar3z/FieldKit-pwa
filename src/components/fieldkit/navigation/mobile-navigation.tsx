"use client";

import { usePathname } from "next/navigation";
import {
  isWorkspaceRouteActive,
  primaryNavigation,
} from "@/lib/navigation/workspace";
import { cn } from "@/lib/shared/utils";
import { WorkspaceLink as Link } from "./workspace-link";

export function MobileNavigation() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 flex items-center justify-around border-t bg-background px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      {primaryNavigation.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={
            isWorkspaceRouteActive(pathname, href) ? "page" : undefined
          }
          className={cn(
            "flex min-h-12 min-w-16 flex-col items-center justify-center gap-1 rounded-lg px-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground",
            isWorkspaceRouteActive(pathname, href) &&
              "bg-muted text-foreground",
          )}
        >
          <Icon className="size-5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

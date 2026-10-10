"use client";

import {
  ArrowUpRightIcon,
  BookOpenIcon,
  FolderIcon,
  HouseIcon,
  MenuIcon,
  NotebookPenIcon,
  PlusIcon,
  SunIcon,
} from "lucide-react";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { type ReactNode, Suspense, useState } from "react";
import { WorkspaceLink as Link } from "@/components/fieldkit/workspace-link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { LinkButton } from "./link-button";
import { ServiceWorkerUpdatePrompt } from "./service-worker-update-prompt";
import { WorkspaceClock } from "./workspace-clock";
import { WorkspaceFeedback } from "./workspace-feedback";

const primaryNavigation = [
  { href: "/", label: "Today", icon: SunIcon },
  { href: "/projects", label: "Projects", icon: FolderIcon },
] satisfies { href: Route; label: string; icon: typeof SunIcon }[];

function Brand() {
  return (
    <Link href="/" className="flex min-h-11 items-center gap-3">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <NotebookPenIcon className="size-5" />
      </span>
      <span className="text-lg font-semibold tracking-tight">
        FieldKit<span className="text-muted-foreground">.</span>
      </span>
    </Link>
  );
}

export function AppShell({
  children,
  accountActions,
}: {
  children: ReactNode;
  accountActions: ReactNode;
}) {
  // Navigation state is UI-only; it is never stored in cookies or browser storage.
  const [menuOpen, setMenuOpen] = useState(false);

  function Navigation() {
    const pathname = usePathname();
    return (
      <nav aria-label="Workspace navigation" className="flex flex-col gap-7">
        <div className="flex flex-col gap-1">
          {primaryNavigation.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
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
          onClick={() => setMenuOpen(false)}
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

  function MobileNavigation() {
    const pathname = usePathname();
    return (
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 flex items-center justify-around border-t bg-background px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        {[
          ...primaryNavigation,
          { href: "/tasks/new" as const, label: "New task", icon: PlusIcon },
          {
            href: "/notes/new" as const,
            label: "New note",
            icon: NotebookPenIcon,
          },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            className={cn(
              "flex min-h-12 min-w-16 flex-col items-center justify-center gap-1 rounded-lg px-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground",
              pathname === href && "bg-muted text-foreground",
            )}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <WorkspaceClock />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r bg-sidebar px-5 py-7 lg:flex">
        <Brand />
        <div className="mt-8">
          <Suspense
            fallback={
              <p className="text-sm text-muted-foreground">
                Loading navigation…
              </p>
            }
          >
            <Navigation />
          </Suspense>
        </div>
        <div className="mt-auto flex flex-col gap-4 pt-8">
          <LinkButton href="/tasks/new">
            <PlusIcon />
            New task
          </LinkButton>
          <p className="text-center text-xs text-muted-foreground">
            A place for your everyday plans.
          </p>
        </div>
      </aside>
      <div className="lg:pl-60">
        <header className="sticky top-0 flex h-18 items-center justify-between gap-4 border-b bg-background/95 px-5 backdrop-blur-sm sm:px-8 lg:px-10">
          <div className="flex items-center gap-3 lg:hidden">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-11 min-w-11"
                    aria-label="Open navigation"
                  />
                }
              >
                <MenuIcon />
              </SheetTrigger>
              <SheetContent side="left" className="max-w-80 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>FieldKit</SheetTitle>
                  <SheetDescription>
                    Your notes, tasks, and everyday plans.
                  </SheetDescription>
                </SheetHeader>
                <div className="px-4 pb-6">
                  <Suspense
                    fallback={
                      <p className="text-sm text-muted-foreground">
                        Loading navigation…
                      </p>
                    }
                  >
                    <Navigation />
                  </Suspense>
                </div>
              </SheetContent>
            </Sheet>
            <Brand />
          </div>
          <p className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
            <HouseIcon className="size-4" />
            My workspace
          </p>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Notes & tasks
            </span>
            {accountActions}
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-7 pb-28 outline-none sm:px-8 sm:py-10 lg:px-10 lg:pb-12"
        >
          <ServiceWorkerUpdatePrompt />
          <WorkspaceFeedback />
          {children}
        </main>
        <Suspense fallback={null}>
          <MobileNavigation />
        </Suspense>
      </div>
    </div>
  );
}

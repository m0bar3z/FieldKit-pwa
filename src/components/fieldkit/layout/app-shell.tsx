"use client";

import { HouseIcon, MenuIcon, PlusIcon } from "lucide-react";
import { type ReactNode, Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { startNoteSync } from "@/lib/products/note-sync";
import { WorkspaceFeedback } from "../feedback/workspace-feedback";
import { LinkButton } from "../navigation/link-button";
import { MobileNavigation } from "../navigation/mobile-navigation";
import { WorkspaceNavigation } from "../navigation/workspace-navigation";
import { InstallationGuide } from "../pwa/installation-guide";
import { ServiceWorkerUpdatePrompt } from "../pwa/service-worker-update-prompt";
import { WorkspaceBrand } from "./workspace-brand";
import { WorkspaceClock } from "./workspace-clock";

export function AppShell({
  children,
  accountActions,
}: {
  children: ReactNode;
  accountActions: ReactNode;
}) {
  // Navigation state is UI-only; it is never stored in cookies or browser storage.
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => startNoteSync(), []);

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
        <WorkspaceBrand />
        <div className="mt-8">
          <Suspense
            fallback={
              <p className="text-sm text-muted-foreground">
                Loading navigation…
              </p>
            }
          >
            <WorkspaceNavigation onNavigate={() => setMenuOpen(false)} />
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
                    <WorkspaceNavigation
                      onNavigate={() => setMenuOpen(false)}
                    />
                  </Suspense>
                </div>
              </SheetContent>
            </Sheet>
            <WorkspaceBrand />
          </div>
          <p className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
            <HouseIcon className="size-4" />
            My workspace
          </p>
          <div className="flex items-center gap-3">
            <InstallationGuide />
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

import type { ReactNode } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { AppShell } from "@/components/fieldkit/app-shell";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <AppShell accountActions={<SignOutButton />}>{children}</AppShell>;
}
